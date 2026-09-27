import type { Lang } from '../domain/types'

const LOCALE: Record<Lang, string> = { en: 'en-US', ru: 'ru-RU' }

interface RecResult { isFinal: boolean; length: number; [i: number]: { transcript: string } }
interface RecEvent { resultIndex: number; results: ArrayLike<RecResult> }
interface RecErrorEvent { error: string }
interface Rec {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  abort(): void
  onresult: ((e: RecEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: RecErrorEvent) => void) | null
}

const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition

export const speechRecognitionSupported = Boolean(Ctor)

// routine: silence between commands, and our own abort() on pause/stop
const ROUTINE_ERRORS = ['no-speech', 'aborted']

export class Recognizer {
  private rec: Rec | null = null
  private _active = false
  private paused = false
  private failures = 0

  constructor(
    private readonly lang: Lang,
    private readonly onTranscript: (alternatives: string[]) => void,
    private readonly onListening: (listening: boolean) => void,
    private readonly onError: (error: string) => void = () => undefined,
  ) {}

  // false once the browser refused the microphone or stop() was called
  get active(): boolean {
    return this._active
  }

  start(): void {
    this._active = true
    this.spawn()
  }

  stop(): void {
    this._active = false
    this.kill()
    this.onListening(false)
  }

  pause(): void {
    this.paused = true
    this.kill()
  }

  resume(): void {
    this.paused = false
    this.spawn()
  }

  private kill(): void {
    const r = this.rec
    this.rec = null
    r?.abort()
  }

  // Chrome on Android stops after a pause; restart while the user wants to listen.
  // Offline it fails instantly with 'network', so back off instead of spinning.
  private restartLater(): void {
    const delay = Math.min(300 * 2 ** this.failures, 5000)
    setTimeout(() => this.spawn(), delay)
  }

  private spawn(): void {
    if (!Ctor || this.rec || this.paused || !this._active) return
    const r = new Ctor()
    r.lang = LOCALE[this.lang]
    r.continuous = true
    r.interimResults = false
    // 'point read' often comes with 'point red' as the second guess
    r.maxAlternatives = 5
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (!res.isFinal) continue
        const alternatives = Array.from({ length: res.length }, (_, k) => res[k].transcript)
        this.onTranscript(alternatives)
      }
    }
    let failed = false
    r.onend = () => {
      if (this.rec !== r) return
      this.rec = null
      if (!failed) this.failures = 0
      this.restartLater()
    }
    r.onerror = (e) => {
      if (!ROUTINE_ERRORS.includes(e.error)) this.onError(e.error)
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') this.stop()
      else if (e.error === 'network' || e.error === 'audio-capture') {
        failed = true
        this.failures++
      }
    }
    this.rec = r
    try {
      r.start()
    } catch (err) {
      // the previous session has not released the microphone yet
      this.rec = null
      this.failures++
      this.onError(err instanceof Error ? err.message : String(err))
      this.restartLater()
      return
    }
    this.onListening(true)
  }
}

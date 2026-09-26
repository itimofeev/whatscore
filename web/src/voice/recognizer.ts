import type { Lang } from '../domain/types'

const LOCALE: Record<Lang, string> = { en: 'en-US', ru: 'ru-RU' }

interface RecResult { isFinal: boolean; 0: { transcript: string } }
interface RecEvent { resultIndex: number; results: ArrayLike<RecResult> }
interface RecErrorEvent { error: string }
interface Rec {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  abort(): void
  onresult: ((e: RecEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: RecErrorEvent) => void) | null
}

const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition

export const speechRecognitionSupported = Boolean(Ctor)

export class Recognizer {
  private rec: Rec | null = null
  private active = false
  private paused = false

  constructor(
    private readonly lang: Lang,
    private readonly onTranscript: (text: string) => void,
    private readonly onListening: (listening: boolean) => void,
  ) {}

  start(): void {
    this.active = true
    this.spawn()
  }

  stop(): void {
    this.active = false
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

  private spawn(): void {
    if (!Ctor || this.rec || this.paused || !this.active) return
    const r = new Ctor()
    r.lang = LOCALE[this.lang]
    r.continuous = true
    r.interimResults = false
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) this.onTranscript(res[0].transcript)
      }
    }
    r.onend = () => {
      if (this.rec !== r) return
      this.rec = null
      // Chrome on Android stops after a pause; restart while the user wants to listen
      setTimeout(() => this.spawn(), 300)
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') this.stop()
    }
    this.rec = r
    r.start()
    this.onListening(true)
  }
}

import { reduce } from './domain/reduce'
import type { MatchConfig, MatchEvent, MatchState, Team } from './domain/types'
import type { MatchStorage } from './storage'
import { MatchScreen } from './ui/match'
import { enterFullscreen, keepScreenOn } from './ui/screen'
import { renderSetup } from './ui/setup'
import { afterPointText, scoreText } from './voice/announce'
import { parseCommand } from './voice/commands'
import { Recognizer, speechRecognitionSupported } from './voice/recognizer'
import { speak } from './voice/speaker'

export class App {
  private config: MatchConfig
  private events: MatchEvent[] = []
  private state: MatchState
  private screen: MatchScreen | null = null
  private recognizer: Recognizer | null = null
  private listening = false
  private announcing = 0

  constructor(
    private readonly root: HTMLElement,
    private readonly storage: MatchStorage,
  ) {
    this.config = storage.loadLastConfig()
    this.state = reduce(this.config, this.events)
  }

  boot(): void {
    const stored = this.storage.loadMatch()
    if (stored) {
      this.config = stored.config
      this.events = stored.events
      this.showMatch()
    } else {
      this.showSetup()
    }
  }

  private showSetup(): void {
    this.stopVoice()
    this.screen = null
    const resume = this.storage.loadMatch() ? () => this.showMatch() : undefined
    renderSetup(this.root, this.config, (config) => this.startMatch(config), resume)
  }

  private startMatch(config: MatchConfig): void {
    this.config = config
    this.events = []
    this.storage.saveLastConfig(config)
    this.storage.saveMatch({ config, events: this.events })
    enterFullscreen()
    this.showMatch()
  }

  private showMatch(): void {
    keepScreenOn()
    this.screen = new MatchScreen(this.root, {
      onPoint: (team) => this.point(team),
      onUndo: () => this.undo(),
      onNewMatch: () => this.newMatch(),
      onToggleVoice: () => this.toggleVoice(),
      onExit: () => this.showSetup(),
    })
    this.draw()
    if (this.config.voice.enabled) this.startVoice()
  }

  private point(team: Team): void {
    if (this.state.finished) return
    const prev = this.state
    this.push({ type: 'point', team, at: Date.now() })
    this.screen?.toast(`Point ${this.config.teams[team].name}`)
    if (this.config.voice.announce) void this.say(afterPointText(prev, this.state, team, this.config))
  }

  private undo(): void {
    if (!this.state.canUndo) return
    this.push({ type: 'undo', at: Date.now() })
    navigator.vibrate?.(60)
    this.screen?.toast('Undo')
  }

  private push(e: MatchEvent): void {
    this.events.push(e)
    this.storage.saveMatch({ config: this.config, events: this.events })
    this.draw()
  }

  private newMatch(): void {
    this.stopVoice()
    this.storage.clearMatch()
    this.events = []
    this.showSetup()
  }

  private draw(): void {
    this.state = reduce(this.config, this.events)
    this.screen?.render({
      config: this.config,
      state: this.state,
      listening: this.listening,
      voiceAvailable: speechRecognitionSupported,
    })
  }

  private startVoice(): void {
    if (!speechRecognitionSupported || this.recognizer) return
    this.recognizer = new Recognizer(
      this.config.voice.lang,
      (text) => this.onTranscript(text),
      (listening) => {
        this.listening = listening
        this.draw()
      },
    )
    this.recognizer.start()
  }

  private stopVoice(): void {
    this.recognizer?.stop()
    this.recognizer = null
    this.listening = false
  }

  private toggleVoice(): void {
    if (this.recognizer) this.stopVoice()
    else this.startVoice()
    this.draw()
  }

  private onTranscript(text: string): void {
    const cmd = parseCommand(text, [this.config.teams[0].name, this.config.teams[1].name], this.config.voice.lang)
    if (!cmd) return
    if (cmd.type === 'point') this.point(cmd.team)
    else if (cmd.type === 'undo') this.undo()
    else void this.say(scoreText(this.state, this.config))
  }

  private async say(text: string): Promise<void> {
    // overlapping announcements: the mic comes back only after the last one
    this.announcing++
    this.recognizer?.pause()
    await speak(text, this.config.voice.lang)
    if (--this.announcing === 0) this.recognizer?.resume()
  }
}

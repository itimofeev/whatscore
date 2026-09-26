import { reduce } from './domain/reduce'
import type { MatchConfig, MatchEvent, MatchState, Team } from './domain/types'
import type { MatchStorage } from './storage'
import { MatchScreen } from './ui/match'
import { enterFullscreen, keepScreenOn } from './ui/screen'
import { renderSetup } from './ui/setup'

export class App {
  private config: MatchConfig
  private events: MatchEvent[] = []
  private state: MatchState
  private screen: MatchScreen | null = null

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
    this.screen = null
    renderSetup(this.root, this.config, (config) => this.startMatch(config))
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
      onToggleVoice: () => {},
      onExit: () => this.showSetup(),
    })
    this.draw()
  }

  private point(team: Team): void {
    if (this.state.finished) return
    this.push({ type: 'point', team, at: Date.now() })
    this.screen?.toast(`Point ${this.config.teams[team].name}`)
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
    this.storage.clearMatch()
    this.events = []
    this.showSetup()
  }

  private draw(): void {
    this.state = reduce(this.config, this.events)
    this.screen?.render({ config: this.config, state: this.state, listening: false, voiceAvailable: false })
  }
}

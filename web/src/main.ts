import './style.css'
import { reduce } from './domain/reduce'
import { defaultConfig, type MatchEvent } from './domain/types'
import { MatchScreen } from './ui/match'

const root = document.getElementById('app')!
const config = defaultConfig()
let events: MatchEvent[] = []

const screen = new MatchScreen(root, {
  onPoint: (team) => {
    events.push({ type: 'point', team, at: Date.now() })
    screen.toast(`Point ${config.teams[team].name}`)
    draw()
  },
  onUndo: () => {
    events.push({ type: 'undo', at: Date.now() })
    draw()
  },
  onNewMatch: () => {
    events = []
    draw()
  },
  onToggleVoice: () => {},
  onExit: () => {},
})

function draw() {
  screen.render({ config, state: reduce(config, events), listening: false, voiceAvailable: false })
}
draw()

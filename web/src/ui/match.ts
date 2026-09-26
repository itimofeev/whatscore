import type { MatchConfig, MatchState, Team } from '../domain/types'
import { decidingLabel } from '../voice/announce'
import { attachPressHandlers } from './longpress'

export interface MatchScreenHandlers {
  onPoint(team: Team): void
  onUndo(): void
  onNewMatch(): void
  onToggleVoice(): void
  onExit(): void
}

export interface MatchScreenView {
  config: MatchConfig
  state: MatchState
  listening: boolean
  voiceAvailable: boolean
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  e.className = className
  if (text) e.textContent = text
  return e
}

interface Zone {
  root: HTMLElement
  pts: HTMLElement
  name: HTMLElement
  games: HTMLElement
  sets: HTMLElement
}

export class MatchScreen {
  private readonly root: HTMLElement
  private readonly zones: [Zone, Zone]
  private readonly serverLine: HTMLElement
  private readonly deciding: HTMLElement
  private readonly toastEl: HTMLElement
  private readonly micBtn: HTMLButtonElement
  private readonly endOverlay: HTMLElement
  private readonly endText: HTMLElement
  private readonly exitOverlay: HTMLElement
  private toastTimer: number | null = null

  constructor(root: HTMLElement, private readonly h: MatchScreenHandlers) {
    this.root = root
    root.innerHTML = ''
    root.className = 'match'

    this.zones = [this.makeZone(0), this.makeZone(1)]

    const bar = el('div', 'bar')
    this.serverLine = el('div', 'server')
    this.deciding = el('div', 'deciding')
    bar.append(this.serverLine, this.deciding)

    this.toastEl = el('div', 'toast')

    const controls = el('div', 'controls')
    this.micBtn = el('button', 'ctl mic')
    this.micBtn.type = 'button'
    this.micBtn.addEventListener('click', () => this.h.onToggleVoice())
    const exitBtn = el('button', 'ctl', '⚙')
    exitBtn.type = 'button'
    exitBtn.addEventListener('click', () => this.exitOverlay.classList.remove('hidden'))
    controls.append(this.micBtn, exitBtn)

    // no window.confirm: native dialogs block browser automation and look off in fullscreen
    this.exitOverlay = el('div', 'end hidden')
    const exitText = el('div', 'end-text', 'Go to settings?\nThe match stays saved.')
    const leaveBtn = el('button', 'big', 'Settings')
    leaveBtn.type = 'button'
    leaveBtn.addEventListener('click', () => this.h.onExit())
    const stayBtn = el('button', 'big secondary', 'Back to match')
    stayBtn.type = 'button'
    stayBtn.addEventListener('click', () => this.exitOverlay.classList.add('hidden'))
    this.exitOverlay.append(exitText, leaveBtn, stayBtn)

    this.endOverlay = el('div', 'end hidden')
    this.endText = el('div', 'end-text')
    const newBtn = el('button', 'big', 'New match')
    newBtn.type = 'button'
    newBtn.addEventListener('click', () => this.h.onNewMatch())
    const undoBtn = el('button', 'big secondary', 'Undo last point')
    undoBtn.type = 'button'
    undoBtn.addEventListener('click', () => this.h.onUndo())
    this.endOverlay.append(this.endText, newBtn, undoBtn)

    root.append(this.zones[0].root, bar, this.zones[1].root, this.toastEl, controls, this.exitOverlay, this.endOverlay)
  }

  private makeZone(team: Team): Zone {
    const root = el('div', `zone team${team}`)
    root.dataset.team = String(team)
    const pts = el('div', 'pts')
    const name = el('div', 'name')
    const meta = el('div', 'meta')
    const games = el('span', 'games')
    const sets = el('span', 'sets')
    meta.append(games, sets)
    root.append(pts, name, meta)
    attachPressHandlers(root, {
      onTap: () => this.h.onPoint(team),
      onLongPress: () => this.h.onUndo(),
    })
    return { root, pts, name, games, sets }
  }

  render(v: MatchScreenView): void {
    const { state, config } = v
    const swapped = config.swapZonesWithSides && state.swapped
    this.root.classList.toggle('swapped', swapped)

    for (const team of [0, 1] as const) {
      const z = this.zones[team]
      z.pts.textContent = String(state.game.points[team])
      z.name.textContent = config.teams[team].name
      const current = state.sets[state.sets.length - 1]
      const finishedSets = state.finished ? state.sets : state.sets.slice(0, -1)
      z.games.textContent = state.finished ? '' : `Games ${current[team]}`
      z.sets.textContent = finishedSets.length ? `Prev sets ${finishedSets.map((s) => s[team]).join(' ')}` : ''
      z.root.classList.toggle('serving', state.server.team === team)
    }

    const sv = state.server
    const serverName = config.teams[sv.team].players[sv.player]
    this.serverLine.textContent = `${serverName}  ${sv.side === 'right' ? 'R' : 'L'}`
    this.serverLine.className = `server team${sv.team}`

    if (state.decidingPoint) {
      this.deciding.textContent = decidingLabel(config.deuceMode, 'en')
      this.deciding.classList.add('on')
    } else if (state.game.kind === 'tiebreak') {
      this.deciding.textContent = state.game.target === 10 ? 'Super tiebreak' : 'Tiebreak'
      this.deciding.classList.add('on')
    } else {
      this.deciding.textContent = ''
      this.deciding.classList.remove('on')
    }

    this.micBtn.hidden = !v.voiceAvailable
    this.micBtn.textContent = v.listening ? '🎤' : '🔇'
    this.micBtn.classList.toggle('on', v.listening)

    if (state.finished) {
      const w = state.finished.winner
      const score = state.sets.map((s) => `${s[w]}-${s[w === 0 ? 1 : 0]}`).join('  ')
      this.endText.textContent = `${config.teams[w].name} wins  ${score}`
      this.endOverlay.classList.remove('hidden')
    } else {
      this.endOverlay.classList.add('hidden')
    }
  }

  toast(text: string): void {
    this.toastEl.textContent = text
    this.toastEl.classList.add('show')
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 2000)
  }
}

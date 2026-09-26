import { effectivePoints } from './events'
import {
  other,
  type DeuceMode,
  type GameScore,
  type MatchConfig,
  type MatchEvent,
  type MatchState,
  type Pts,
  type Server,
  type Team,
} from './types'

interface Internal {
  sets: Array<[number, number]>
  points: [number, number]
  deuces: number
  tiebreak: { points: [number, number]; target: 7 | 10 } | null
  gameIndex: number
  sideChanges: number
  finished: Team | null
}

function isDeciding(s: Internal, mode: DeuceMode): boolean {
  if (s.tiebreak || mode === 'advantage') return false
  return s.points[0] === s.points[1] && s.points[0] >= 3 && s.deuces >= mode
}

function applyPoint(s: Internal, team: Team, config: MatchConfig): void {
  if (s.finished !== null) return
  const deciding = isDeciding(s, config.deuceMode)
  s.points[team]++
  if (s.points[0] === s.points[1] && s.points[0] >= 3) s.deuces++
  const won = deciding || (s.points[team] >= 4 && s.points[team] - s.points[other(team)] >= 2)
  if (won) gameWon(s, team)
}

function gameWon(s: Internal, team: Team): void {
  s.points = [0, 0]
  s.deuces = 0
  s.gameIndex++
  s.sets[s.sets.length - 1][team]++
}

function toPts(mine: number, theirs: number): Pts {
  if (mine >= 3 && theirs >= 3) return mine > theirs ? 'AD' : 40
  return ([0, 15, 30, 40] as const)[Math.min(mine, 3)]
}

function serverOf(s: Internal, config: MatchConfig): Server {
  const total = s.points[0] + s.points[1]
  return { team: config.firstServingTeam, player: 0, side: total % 2 === 0 ? 'right' : 'left' }
}

export function reduce(config: MatchConfig, events: MatchEvent[]): MatchState {
  const points = effectivePoints(events)
  const s: Internal = {
    sets: [[0, 0]],
    points: [0, 0],
    deuces: 0,
    tiebreak: null,
    gameIndex: 0,
    sideChanges: 0,
    finished: null,
  }
  for (const t of points) applyPoint(s, t, config)

  const game: GameScore = s.tiebreak
    ? { kind: 'tiebreak', points: [s.tiebreak.points[0], s.tiebreak.points[1]], target: s.tiebreak.target }
    : {
        kind: 'game',
        points: [toPts(s.points[0], s.points[1]), toPts(s.points[1], s.points[0])],
        deuces: s.deuces,
      }

  return {
    sets: s.sets.map(([a, b]) => [a, b]),
    game,
    server: serverOf(s, config),
    decidingPoint: isDeciding(s, config.deuceMode),
    swapped: s.sideChanges % 2 === 1,
    finished: s.finished === null ? null : { winner: s.finished },
    canUndo: points.length > 0,
  }
}

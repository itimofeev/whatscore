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
  if (s.tiebreak) {
    applyTiebreakPoint(s, team, config)
    return
  }
  const deciding = isDeciding(s, config.deuceMode)
  s.points[team]++
  if (s.points[0] === s.points[1] && s.points[0] >= 3) s.deuces++
  const won = deciding || (s.points[team] >= 4 && s.points[team] - s.points[other(team)] >= 2)
  if (won) gameWon(s, team, config)
}

function applyTiebreakPoint(s: Internal, team: Team, config: MatchConfig): void {
  const tb = s.tiebreak!
  tb.points[team]++
  const won = tb.points[team] >= tb.target && tb.points[team] - tb.points[other(team)] >= 2
  if (won) {
    gameWon(s, team, config)
    return
  }
  const total = tb.points[0] + tb.points[1]
  if (total % 6 === 0) s.sideChanges++
}

function setsWon(s: Internal, team: Team): number {
  return s.sets.filter((set) => set[team] > set[other(team)]).length
}

function gameWon(s: Internal, team: Team, config: MatchConfig): void {
  const wasTiebreak = s.tiebreak !== null
  s.tiebreak = null
  s.points = [0, 0]
  s.deuces = 0
  s.gameIndex++
  const set = s.sets[s.sets.length - 1]
  set[team]++

  const setWon = wasTiebreak || (set[team] >= 6 && set[team] - set[other(team)] >= 2)
  if (setWon) {
    const need = config.format === 'one_set' ? 1 : 2
    if (setsWon(s, team) >= need) {
      s.finished = team
      return
    }
  }
  // after a winning tiebreak point the "every 6 points" rule is skipped on purpose:
  // the change is already counted here as the end of an odd-numbered game (13)
  if ((set[0] + set[1]) % 2 === 1) s.sideChanges++
  if (!setWon) {
    if (set[0] === 6 && set[1] === 6) s.tiebreak = { points: [0, 0], target: 7 }
    return
  }
  s.sets.push([0, 0])
  if (config.format === 'best_of_3_super_tb' && setsWon(s, 0) === 1 && setsWon(s, 1) === 1) {
    s.tiebreak = { points: [0, 0], target: 10 }
  }
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

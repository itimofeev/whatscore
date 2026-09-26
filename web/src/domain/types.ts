export type Team = 0 | 1
export type PlayerIdx = 0 | 1
export type DeuceMode = 1 | 2 | 3 | 'advantage'
export type MatchFormat = 'one_set' | 'best_of_3' | 'best_of_3_super_tb'
export type Lang = 'en' | 'ru'

export interface TeamConfig {
  name: string
  players: [string, string]
}

export interface VoiceConfig {
  enabled: boolean
  announce: boolean
  lang: Lang
}

export interface MatchConfig {
  teams: [TeamConfig, TeamConfig]
  firstServingTeam: Team
  deuceMode: DeuceMode
  format: MatchFormat
  swapZonesWithSides: boolean
  voice: VoiceConfig
}

export type MatchEvent =
  | { type: 'point'; team: Team; at: number }
  | { type: 'undo'; at: number }

export type Pts = 0 | 15 | 30 | 40 | 'AD'

export type GameScore =
  | { kind: 'game'; points: [Pts, Pts]; deuces: number }
  | { kind: 'tiebreak'; points: [number, number]; target: 7 | 10 }

export interface Server {
  team: Team
  player: PlayerIdx
  side: 'right' | 'left'
}

export interface MatchState {
  sets: Array<[number, number]>
  game: GameScore
  server: Server
  decidingPoint: boolean
  swapped: boolean
  finished: { winner: Team } | null
  canUndo: boolean
}

export function other(t: Team): Team {
  return t === 0 ? 1 : 0
}

export function defaultConfig(): MatchConfig {
  return {
    teams: [
      { name: 'Red', players: ['Red 1', 'Red 2'] },
      { name: 'Blue', players: ['Blue 1', 'Blue 2'] },
    ],
    firstServingTeam: 0,
    deuceMode: 2,
    format: 'best_of_3',
    swapZonesWithSides: true,
    voice: { enabled: false, announce: false, lang: 'en' },
  }
}

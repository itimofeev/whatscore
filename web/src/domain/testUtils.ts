import type { MatchEvent } from './types'

// 'A' очко команде 0, 'B' команде 1, 'U' отмена
export function pts(seq: string): MatchEvent[] {
  return [...seq].map((c, i) =>
    c === 'U' ? { type: 'undo', at: i } : { type: 'point', team: c === 'A' ? 0 : 1, at: i },
  )
}

export function game(team: 'A' | 'B'): string {
  return team.repeat(4)
}

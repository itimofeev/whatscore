import type { MatchEvent, Team } from './types'

export function effectivePoints(events: MatchEvent[]): Team[] {
  const points: Team[] = []
  for (const e of events) {
    if (e.type === 'point') points.push(e.team)
    else points.pop()
  }
  return points
}

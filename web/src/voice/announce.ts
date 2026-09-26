import { other, type DeuceMode, type Lang, type MatchConfig, type MatchState, type Pts, type Team } from '../domain/types'

interface Texts {
  pts: Record<Exclude<Pts, 'AD'>, string>
  all: (p: string) => string
  deuce: string
  advantage: (name: string) => string
  deciding: Record<DeuceMode, string>
  game: (name: string) => string
  set: (name: string) => string
  match: (name: string) => string
  labels: Record<DeuceMode, string>
}

const T: Record<Lang, Texts> = {
  en: {
    pts: { 0: 'love', 15: 'fifteen', 30: 'thirty', 40: 'forty' },
    all: (p) => `${p} all`,
    deuce: 'deuce',
    advantage: (name) => `advantage ${name}`,
    deciding: { 1: 'golden point', 2: 'deciding point', 3: 'star point', advantage: 'deciding point' },
    game: (name) => `game ${name}`,
    set: (name) => `game and set ${name}`,
    match: (name) => `game, set and match ${name}`,
    labels: { 1: 'Golden point', 2: 'Deciding point', 3: 'Star point', advantage: 'Deciding point' },
  },
  ru: {
    pts: { 0: 'ноль', 15: 'пятнадцать', 30: 'тридцать', 40: 'сорок' },
    all: (p) => `по ${p}`,
    deuce: 'ровно',
    advantage: (name) => `больше ${name}`,
    deciding: { 1: 'золотое очко', 2: 'решающее очко', 3: 'стар поинт', advantage: 'решающее очко' },
    game: (name) => `гейм ${name}`,
    set: (name) => `гейм и сет ${name}`,
    match: (name) => `гейм, сет и матч ${name}`,
    labels: { 1: 'Золотое очко', 2: 'Решающее очко', 3: 'Стар поинт', advantage: 'Решающее очко' },
  },
}

export function decidingLabel(mode: DeuceMode, lang: Lang): string {
  return T[lang].labels[mode]
}

export function scoreText(state: MatchState, config: MatchConfig): string {
  const t = T[config.voice.lang]
  const name = (team: Team) => config.teams[team].name
  if (state.finished) return t.match(name(state.finished.winner))

  const sv = state.server.team
  const rc = other(sv)
  if (state.game.kind === 'tiebreak') {
    return `${state.game.points[sv]} ${state.game.points[rc]}`
  }
  if (state.decidingPoint) return t.deciding[config.deuceMode]
  const [a, b] = state.game.points
  if (a === 'AD') return t.advantage(name(0))
  if (b === 'AD') return t.advantage(name(1))
  if (a === 40 && b === 40) return t.deuce
  if (a === b) return t.all(t.pts[a])
  return `${t.pts[state.game.points[sv] as Exclude<Pts, 'AD'>]} ${t.pts[state.game.points[rc] as Exclude<Pts, 'AD'>]}`
}

function totalGames(sets: Array<[number, number]>): number {
  return sets.reduce((n, [a, b]) => n + a + b, 0)
}

export function afterPointText(prev: MatchState, next: MatchState, team: Team, config: MatchConfig): string {
  const t = T[config.voice.lang]
  const name = config.teams[team].name
  if (next.finished) return t.match(name)
  if (totalGames(next.sets) === totalGames(prev.sets)) return scoreText(next, config)

  const setEnded = next.sets.length > prev.sets.length
  const set = setEnded ? next.sets[next.sets.length - 2] : next.sets[next.sets.length - 1]
  const games = `${set[team]} ${set[other(team)]}`
  return `${setEnded ? t.set(name) : t.game(name)}, ${games}`
}

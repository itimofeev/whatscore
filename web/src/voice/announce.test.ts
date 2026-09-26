import { describe, expect, test } from 'vitest'
import { reduce } from '../domain/reduce'
import { defaultConfig, type DeuceMode, type Lang, type MatchConfig } from '../domain/types'
import { game, pts } from '../domain/testUtils'
import { afterPointText, decidingLabel, scoreText } from './announce'

function cfg(lang: Lang = 'en', deuceMode: DeuceMode = 2): MatchConfig {
  const c = defaultConfig()
  c.voice.lang = lang
  c.deuceMode = deuceMode
  return c
}

function after(seq: string, c = cfg()): string {
  const prev = reduce(c, pts(seq.slice(0, -1)))
  const next = reduce(c, pts(seq))
  const team = seq.at(-1) === 'A' ? 0 : 1
  return afterPointText(prev, next, team, c)
}

describe('scoreText en', () => {
  test('server score first', () => {
    expect(scoreText(reduce(cfg(), []), cfg())).toBe('love all')
    expect(scoreText(reduce(cfg(), pts('A')), cfg())).toBe('fifteen love')
    expect(scoreText(reduce(cfg(), pts('B')), cfg())).toBe('love fifteen')
    // game 2: team 1 serves, so its points come first
    expect(scoreText(reduce(cfg(), pts(game('A') + 'A')), cfg())).toBe('love fifteen')
  })
  test('all, deuce, advantage, deciding', () => {
    expect(scoreText(reduce(cfg(), pts('AB')), cfg())).toBe('fifteen all')
    expect(scoreText(reduce(cfg(), pts('AAABBB')), cfg())).toBe('deuce')
    expect(scoreText(reduce(cfg(), pts('AAABBBA')), cfg())).toBe('advantage Red')
    expect(scoreText(reduce(cfg(), pts('AAABBBAB')), cfg())).toBe('deciding point')
    expect(scoreText(reduce(cfg('en', 1), pts('AAABBB')), cfg('en', 1))).toBe('golden point')
    expect(scoreText(reduce(cfg('en', 3), pts('AAABBBABAB')), cfg('en', 3))).toBe('star point')
  })
  test('tiebreak uses numbers, server first', () => {
    const c = cfg()
    const tb = (game('A') + game('B')).repeat(6)
    // 3 points played: rotation index 12 + 1 + 1 = 14 -> team 0 serves, its points first
    expect(scoreText(reduce(c, pts(tb + 'AAB')), c)).toBe('2 1')
  })
  test('finished match', () => {
    const c = { ...cfg(), format: 'one_set' as const }
    expect(scoreText(reduce(c, pts(game('A').repeat(6))), c)).toBe('game, set and match Red')
  })
})

describe('afterPointText en', () => {
  test('inside a game it is the score', () => {
    expect(after('A')).toBe('fifteen love')
  })
  test('game won announces winner and games, winner first', () => {
    expect(after('AAAA')).toBe('game Red, 1 0')
    expect(after(game('A') + 'BBBB')).toBe('game Blue, 1 1')
  })
  test('set won announces the set', () => {
    expect(after(game('A').repeat(6))).toBe('game and set Red, 6 0')
  })
  test('match won', () => {
    const c = { ...cfg(), format: 'one_set' as const }
    expect(after(game('A').repeat(6), c)).toBe('game, set and match Red')
  })
})

describe('russian', () => {
  test('score words', () => {
    const c = cfg('ru')
    expect(scoreText(reduce(c, pts('A')), c)).toBe('пятнадцать ноль')
    expect(scoreText(reduce(c, pts('AB')), c)).toBe('по пятнадцать')
    expect(scoreText(reduce(c, pts('AAABBB')), c)).toBe('ровно')
    expect(scoreText(reduce(c, pts('AAABBBA')), c)).toBe('больше Red')
    expect(scoreText(reduce(c, pts('AAABBBAB')), c)).toBe('решающее очко')
    expect(after('AAAA', c)).toBe('гейм Red, 1 0')
  })
})

test('decidingLabel', () => {
  expect(decidingLabel(1, 'en')).toBe('Golden point')
  expect(decidingLabel(2, 'en')).toBe('Deciding point')
  expect(decidingLabel(3, 'en')).toBe('Star point')
  expect(decidingLabel('advantage', 'en')).toBe('Deciding point')
  expect(decidingLabel(1, 'ru')).toBe('Золотое очко')
})

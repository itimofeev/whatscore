import { describe, expect, test } from 'vitest'
import { reduce } from './reduce'
import { defaultConfig, type DeuceMode } from './types'
import { pts } from './testUtils'

function cfg(deuceMode: DeuceMode) {
  return { ...defaultConfig(), deuceMode }
}

describe('game points', () => {
  test('starts at love all with undo disabled', () => {
    const s = reduce(cfg(2), [])
    expect(s.game).toEqual({ kind: 'game', points: [0, 0], deuces: 0 })
    expect(s.sets).toEqual([[0, 0]])
    expect(s.canUndo).toBe(false)
    expect(s.finished).toBeNull()
  })

  test('counts 15 30 40', () => {
    expect(reduce(cfg(2), pts('A')).game).toMatchObject({ points: [15, 0] })
    expect(reduce(cfg(2), pts('AAB')).game).toMatchObject({ points: [30, 15] })
    expect(reduce(cfg(2), pts('AAAB')).game).toMatchObject({ points: [40, 15] })
  })

  test('four points with a two point lead win the game', () => {
    const s = reduce(cfg(2), pts('AAAA'))
    expect(s.sets).toEqual([[1, 0]])
    expect(s.game).toMatchObject({ points: [0, 0] })
  })

  test('undo restores the previous score', () => {
    expect(reduce(cfg(2), pts('AAU')).game).toMatchObject({ points: [15, 0] })
    expect(reduce(cfg(2), pts('AAAAU')).sets).toEqual([[0, 0]])
    expect(reduce(cfg(2), pts('AAAAU')).game).toMatchObject({ points: [40, 0] })
  })

  test('undo on empty log keeps love all and canUndo false', () => {
    const s = reduce(cfg(2), pts('U'))
    expect(s.game).toMatchObject({ points: [0, 0] })
    expect(s.canUndo).toBe(false)
  })
})

describe('deuce modes', () => {
  test('golden point: first deuce is deciding', () => {
    const s = reduce(cfg(1), pts('AAABBB'))
    expect(s.game).toMatchObject({ points: [40, 40], deuces: 1 })
    expect(s.decidingPoint).toBe(true)
    expect(reduce(cfg(1), pts('AAABBBB')).sets).toEqual([[0, 1]])
  })

  test('mode 2: first deuce plays advantage, second deuce is deciding', () => {
    expect(reduce(cfg(2), pts('AAABBB')).decidingPoint).toBe(false)
    expect(reduce(cfg(2), pts('AAABBBA')).game).toMatchObject({ points: ['AD', 40] })
    expect(reduce(cfg(2), pts('AAABBBA')).sets).toEqual([[0, 0]])
    expect(reduce(cfg(2), pts('AAABBBAA')).sets).toEqual([[1, 0]])
    const back = reduce(cfg(2), pts('AAABBBAB'))
    expect(back.game).toMatchObject({ points: [40, 40], deuces: 2 })
    expect(back.decidingPoint).toBe(true)
    expect(reduce(cfg(2), pts('AAABBBABB')).sets).toEqual([[0, 1]])
  })

  test('star point: third deuce is deciding', () => {
    expect(reduce(cfg(3), pts('AAABBBAB')).decidingPoint).toBe(false)
    const third = reduce(cfg(3), pts('AAABBBABAB'))
    expect(third.game).toMatchObject({ deuces: 3 })
    expect(third.decidingPoint).toBe(true)
    expect(reduce(cfg(3), pts('AAABBBABABA')).sets).toEqual([[1, 0]])
  })

  test('advantage: never deciding, win by two', () => {
    const s = reduce(cfg('advantage'), pts('AAABBB' + 'AB'.repeat(5)))
    expect(s.decidingPoint).toBe(false)
    expect(s.sets).toEqual([[0, 0]])
    expect(reduce(cfg('advantage'), pts('AAABBB' + 'AB'.repeat(5) + 'BB')).sets).toEqual([[0, 1]])
  })

  test('advantage scoring shows AD for the leader', () => {
    expect(reduce(cfg('advantage'), pts('AAABBBB')).game).toMatchObject({ points: [40, 'AD'] })
  })
})

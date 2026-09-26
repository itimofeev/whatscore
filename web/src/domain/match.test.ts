import { describe, expect, test } from 'vitest'
import { reduce } from './reduce'
import { defaultConfig, type MatchFormat } from './types'
import { game, pts } from './testUtils'

function cfg(format: MatchFormat = 'best_of_3') {
  return { ...defaultConfig(), format }
}

const A = game('A')
const B = game('B')
const setA = A.repeat(6)
const setB = B.repeat(6)
const sixAll = (A + B).repeat(6)

describe('sets', () => {
  test('six games with a two game lead win the set', () => {
    const s = reduce(cfg(), pts(A.repeat(5) + B.repeat(4) + A))
    expect(s.sets).toEqual([[6, 4], [0, 0]])
  })

  test('at 5:5 the set goes on to 7:5', () => {
    expect(reduce(cfg(), pts((A + B).repeat(5) + A)).sets).toEqual([[6, 5]])
    expect(reduce(cfg(), pts((A + B).repeat(5) + A + A)).sets).toEqual([[7, 5], [0, 0]])
  })

  test('6:6 starts a tiebreak to 7', () => {
    const s = reduce(cfg(), pts(sixAll))
    expect(s.sets).toEqual([[6, 6]])
    expect(s.game).toEqual({ kind: 'tiebreak', points: [0, 0], target: 7 })
  })

  test('tiebreak is won at 7 with a two point lead and the set is 7:6', () => {
    expect(reduce(cfg(), pts(sixAll + 'AAAAAA')).game).toMatchObject({ points: [6, 0] })
    expect(reduce(cfg(), pts(sixAll + 'AAAAAAA')).sets).toEqual([[7, 6], [0, 0]])
    const tight = reduce(cfg(), pts(sixAll + 'AAAAAABBBBBB'))
    expect(tight.game).toMatchObject({ kind: 'tiebreak', points: [6, 6] })
    expect(reduce(cfg(), pts(sixAll + 'AAAAAABBBBBBA')).game).toMatchObject({ points: [7, 6] })
    // 8:6 in the tiebreak is still recorded as a 7:6 set
    expect(reduce(cfg(), pts(sixAll + 'AAAAAABBBBBBAA')).sets).toEqual([[7, 6], [0, 0]])
  })

  test('undo inside a tiebreak', () => {
    expect(reduce(cfg(), pts(sixAll + 'AAU')).game).toMatchObject({ kind: 'tiebreak', points: [1, 0] })
    expect(reduce(cfg(), pts(sixAll + 'AAAAAAAU')).sets).toEqual([[6, 6]])
  })
})

describe('match formats', () => {
  test('one_set finishes after one set', () => {
    const s = reduce(cfg('one_set'), pts(setA))
    expect(s.finished).toEqual({ winner: 0 })
    expect(s.sets).toEqual([[6, 0]])
  })

  test('best_of_3 needs two sets', () => {
    expect(reduce(cfg(), pts(setA)).finished).toBeNull()
    expect(reduce(cfg(), pts(setA + setB)).sets).toEqual([[6, 0], [0, 6], [0, 0]])
    const s = reduce(cfg(), pts(setA + setB + setB))
    expect(s.finished).toEqual({ winner: 1 })
    expect(s.sets).toEqual([[6, 0], [0, 6], [0, 6]])
  })

  test('best_of_3_super_tb plays a tiebreak to 10 at one set all', () => {
    const s = reduce(cfg('best_of_3_super_tb'), pts(setA + setB))
    expect(s.sets).toEqual([[6, 0], [0, 6], [0, 0]])
    expect(s.game).toEqual({ kind: 'tiebreak', points: [0, 0], target: 10 })
    expect(reduce(cfg('best_of_3_super_tb'), pts(setA + setB + 'A'.repeat(9))).finished).toBeNull()
    const done = reduce(cfg('best_of_3_super_tb'), pts(setA + setB + 'A'.repeat(10)))
    expect(done.finished).toEqual({ winner: 0 })
    expect(done.sets).toEqual([[6, 0], [0, 6], [1, 0]])
  })

  test('best_of_3_super_tb without a decider is a normal best of three', () => {
    expect(reduce(cfg('best_of_3_super_tb'), pts(setA + setA)).finished).toEqual({ winner: 0 })
  })

  test('points after the match is finished are ignored', () => {
    const done = reduce(cfg('one_set'), pts(setA))
    const extra = reduce(cfg('one_set'), pts(setA + 'BBBB'))
    expect(extra.sets).toEqual(done.sets)
    expect(extra.game).toEqual(done.game)
    expect(extra.finished).toEqual(done.finished)
  })

  test('undo reopens a finished match', () => {
    const s = reduce(cfg('one_set'), pts(setA + 'U'))
    expect(s.finished).toBeNull()
    expect(s.sets).toEqual([[5, 0]])
    expect(s.game).toMatchObject({ points: [40, 0] })
  })
})

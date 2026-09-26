import { describe, expect, test } from 'vitest'
import { reduce } from './reduce'
import { defaultConfig, type Team } from './types'
import { game, pts } from './testUtils'

function cfg(firstServingTeam: Team = 0) {
  return { ...defaultConfig(), firstServingTeam }
}

const A = game('A')
const B = game('B')
const sixAll = (A + B).repeat(6)

describe('server rotation', () => {
  test('first serving team player 0 serves the first game from the right', () => {
    expect(reduce(cfg(0), []).server).toEqual({ team: 0, player: 0, side: 'right' })
    expect(reduce(cfg(1), []).server).toEqual({ team: 1, player: 0, side: 'right' })
  })

  test('side alternates with every point', () => {
    expect(reduce(cfg(), pts('A')).server.side).toBe('left')
    expect(reduce(cfg(), pts('AB')).server.side).toBe('right')
    expect(reduce(cfg(), pts('ABA')).server.side).toBe('left')
  })

  test('rotation T1p0, T2p0, T1p1, T2p1 across games', () => {
    expect(reduce(cfg(), pts(A)).server).toMatchObject({ team: 1, player: 0 })
    expect(reduce(cfg(), pts(A + B)).server).toMatchObject({ team: 0, player: 1 })
    expect(reduce(cfg(), pts(A + B + A)).server).toMatchObject({ team: 1, player: 1 })
    expect(reduce(cfg(), pts(A + B + A + B)).server).toMatchObject({ team: 0, player: 0 })
  })

  test('rotation continues into the next set', () => {
    // 6 games: next index is 6 % 4 = 2 -> team 0 player 1
    expect(reduce(cfg(), pts(A.repeat(6))).server).toMatchObject({ team: 0, player: 1 })
  })

  test('tiebreak: one point, then two points each, side by point parity', () => {
    // 12 games played -> rotation index 0 serves point 0
    expect(reduce(cfg(), pts(sixAll)).server).toEqual({ team: 0, player: 0, side: 'right' })
    expect(reduce(cfg(), pts(sixAll + 'A')).server).toEqual({ team: 1, player: 0, side: 'left' })
    expect(reduce(cfg(), pts(sixAll + 'AB')).server).toEqual({ team: 1, player: 0, side: 'right' })
    expect(reduce(cfg(), pts(sixAll + 'ABA')).server).toEqual({ team: 0, player: 1, side: 'left' })
    expect(reduce(cfg(), pts(sixAll + 'ABAB')).server).toEqual({ team: 0, player: 1, side: 'right' })
    expect(reduce(cfg(), pts(sixAll + 'ABABA')).server).toEqual({ team: 1, player: 1, side: 'left' })
    expect(reduce(cfg(), pts(sixAll + 'ABABABA')).server).toEqual({ team: 0, player: 0, side: 'left' })
  })

  test('after a tiebreak the other team serves the next set with its next player', () => {
    // tiebreak counts as game 12; next set starts at index 13 % 4 = 1
    expect(reduce(cfg(), pts(sixAll + 'AAAAAAA')).server).toEqual({ team: 1, player: 0, side: 'right' })
  })
})

describe('side changes', () => {
  test('after games 1, 3, 5 of a set', () => {
    expect(reduce(cfg(), []).swapped).toBe(false)
    expect(reduce(cfg(), pts(A)).swapped).toBe(true)
    expect(reduce(cfg(), pts(A + B)).swapped).toBe(true)
    expect(reduce(cfg(), pts(A + B + A)).swapped).toBe(false)
  })

  test('a 6:0 set has three changes and the next set restarts the count', () => {
    expect(reduce(cfg(), pts(A.repeat(6))).swapped).toBe(true)
    expect(reduce(cfg(), pts(A.repeat(7))).swapped).toBe(false)
  })

  test('tiebreak changes every six points, and at the end of the set', () => {
    expect(reduce(cfg(), pts(sixAll)).swapped).toBe(false)
    expect(reduce(cfg(), pts(sixAll + 'AAABBB')).swapped).toBe(true)
    expect(reduce(cfg(), pts(sixAll + 'AAABBBAAABB')).swapped).toBe(true)
    // 7:5 in the tiebreak: 12 points, set ends at 13 games -> one more change, not two
    expect(reduce(cfg(), pts(sixAll + 'AAABBBAAABBA')).swapped).toBe(false)
  })

  test('no side change is recorded on the final point of the match', () => {
    const s = reduce({ ...cfg(), format: 'one_set' }, pts(A.repeat(6)))
    expect(s.finished).toEqual({ winner: 0 })
    expect(s.swapped).toBe(true) // 3 changes after games 1, 3, 5 and none after game 6
  })
})

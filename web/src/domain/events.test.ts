import { describe, expect, test } from 'vitest'
import { effectivePoints } from './events'
import { pts } from './testUtils'

describe('effectivePoints', () => {
  test('keeps points in order', () => {
    expect(effectivePoints(pts('ABA'))).toEqual([0, 1, 0])
  })
  test('undo removes the last point', () => {
    expect(effectivePoints(pts('ABU'))).toEqual([0])
  })
  test('several undos remove several points', () => {
    expect(effectivePoints(pts('ABAUU'))).toEqual([0])
  })
  test('undo on empty log is a no-op', () => {
    expect(effectivePoints(pts('U'))).toEqual([])
    expect(effectivePoints(pts('AUU'))).toEqual([])
  })
})

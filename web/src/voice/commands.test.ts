import { describe, expect, test } from 'vitest'
import { parseCommand } from './commands'

const names: [string, string] = ['Red', 'Blue']

describe('english commands', () => {
  test.each([
    ['point red', { type: 'point', team: 0 }],
    ['Point Blue.', { type: 'point', team: 1 }],
    ['blue point', { type: 'point', team: 1 }],
    ["red's point", { type: 'point', team: 0 }],
    ['point one', { type: 'point', team: 0 }],
    ['point two', { type: 'point', team: 1 }],
    ['point 2', { type: 'point', team: 1 }],
    ['undo', { type: 'undo' }],
    ['undo that', { type: 'undo' }],
    ['cancel', { type: 'undo' }],
    ['score', { type: 'score' }],
    ["what's the score", { type: 'score' }],
  ])('%s', (text, expected) => {
    expect(parseCommand(text, names, 'en')).toEqual(expected)
  })

  test.each(['hello there', 'red', 'point', 'point red blue', 'point green', ''])(
    'no command in "%s"',
    (text) => {
      expect(parseCommand(text, names, 'en')).toBeNull()
    },
  )

  test('names sharing a word are told apart by the distinctive word', () => {
    const teams: [string, string] = ['Team Red', 'Team Blue']
    expect(parseCommand('point team blue', teams, 'en')).toEqual({ type: 'point', team: 1 })
    expect(parseCommand('point team', teams, 'en')).toBeNull()
  })

  test('name prefix matches inflected forms', () => {
    const teams: [string, string] = ['Ilya', 'Andreas']
    expect(parseCommand('point ilyas', teams, 'en')).toEqual({ type: 'point', team: 0 })
  })
})

describe('russian commands', () => {
  const ru: [string, string] = ['Красные', 'Синие']
  test.each([
    ['очко красным', { type: 'point', team: 0 }],
    ['синие очко', { type: 'point', team: 1 }],
    ['очко первым', { type: 'point', team: 0 }],
    ['очко вторым', { type: 'point', team: 1 }],
    ['отмена', { type: 'undo' }],
    ['отменить', { type: 'undo' }],
    ['счёт', { type: 'score' }],
    ['какой счет', { type: 'score' }],
  ])('%s', (text, expected) => {
    expect(parseCommand(text, ru, 'ru')).toEqual(expected)
  })

  test('russian keyword with english team names', () => {
    expect(parseCommand('очко ред', ['Ред', 'Блю'], 'ru')).toEqual({ type: 'point', team: 0 })
  })
})

import { describe, expect, test } from 'vitest'
import { createStorage, mergeConfig, type KV } from './storage'
import { defaultConfig } from './domain/types'

function memory(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

describe('storage', () => {
  test('saves and loads the current match', () => {
    const st = createStorage(memory())
    const match = { config: defaultConfig(), events: [{ type: 'point' as const, team: 0 as const, at: 1 }] }
    st.saveMatch(match)
    expect(st.loadMatch()).toEqual(match)
  })

  test('clearMatch removes the match', () => {
    const st = createStorage(memory())
    st.saveMatch({ config: defaultConfig(), events: [] })
    st.clearMatch()
    expect(st.loadMatch()).toBeNull()
  })

  test('corrupted json yields null and defaults', () => {
    const kv = memory()
    kv.setItem('whatscore.match', '{oops')
    kv.setItem('whatscore.lastConfig', '[1,2')
    const st = createStorage(kv)
    expect(st.loadMatch()).toBeNull()
    expect(st.loadLastConfig()).toEqual(defaultConfig())
  })

  test('throwing storage is tolerated', () => {
    const kv: KV = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
      removeItem: () => { throw new Error('blocked') },
    }
    const st = createStorage(kv)
    expect(() => st.saveMatch({ config: defaultConfig(), events: [] })).not.toThrow()
    expect(() => st.clearMatch()).not.toThrow()
    expect(st.loadMatch()).toBeNull()
    expect(st.loadLastConfig()).toEqual(defaultConfig())
  })

  test('lastConfig from an older schema is merged with defaults', () => {
    const kv = memory()
    kv.setItem('whatscore.lastConfig', JSON.stringify({ deuceMode: 3, voice: { enabled: true } }))
    const st = createStorage(kv)
    const c = st.loadLastConfig()
    expect(c.deuceMode).toBe(3)
    expect(c.voice).toEqual({ enabled: true, announce: false, lang: 'en' })
    expect(c.teams).toEqual(defaultConfig().teams)
  })

  test('a stored match with a partial config is merged too', () => {
    const kv = memory()
    kv.setItem('whatscore.match', JSON.stringify({ config: { format: 'one_set' }, events: [] }))
    const m = createStorage(kv).loadMatch()
    expect(m?.config.format).toBe('one_set')
    expect(m?.config.teams[1].name).toBe('Blue')
  })

  test('mergeConfig ignores non-objects', () => {
    expect(mergeConfig(null)).toEqual(defaultConfig())
    expect(mergeConfig('x')).toEqual(defaultConfig())
  })
})

describe('mergeConfig team fields', () => {
  test('a team without players gets default players', () => {
    const c = mergeConfig({ teams: [{ name: 'Us' }, { name: 'Them' }] })
    expect(c.teams[0]).toEqual({ name: 'Us', players: ['Red 1', 'Red 2'] })
    expect(c.teams[1]).toEqual({ name: 'Them', players: ['Blue 1', 'Blue 2'] })
  })

  test('a team with a broken players array gets default players', () => {
    const c = mergeConfig({ teams: [{ name: 'Us', players: ['Only one'] }, { players: 'x' }] })
    expect(c.teams[0].players).toEqual(['Red 1', 'Red 2'])
    expect(c.teams[1]).toEqual({ name: 'Blue', players: ['Blue 1', 'Blue 2'] })
  })

  test('firstServingTeam outside 0|1 falls back to 0', () => {
    expect(mergeConfig({ firstServingTeam: 5 }).firstServingTeam).toBe(0)
    expect(mergeConfig({ firstServingTeam: 1 }).firstServingTeam).toBe(1)
  })
})

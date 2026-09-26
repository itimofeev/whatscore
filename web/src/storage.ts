import { defaultConfig, type MatchConfig, type MatchEvent } from './domain/types'

export interface StoredMatch {
  config: MatchConfig
  events: MatchEvent[]
}

export interface KV {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
}

export interface MatchStorage {
  loadMatch(): StoredMatch | null
  saveMatch(m: StoredMatch): void
  clearMatch(): void
  loadLastConfig(): MatchConfig
  saveLastConfig(c: MatchConfig): void
}

const MATCH_KEY = 'whatscore.match'
const CONFIG_KEY = 'whatscore.lastConfig'

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function mergeConfig(partial: unknown): MatchConfig {
  const d = defaultConfig()
  if (!isObject(partial)) return d
  const p = partial as Partial<MatchConfig>
  return {
    ...d,
    ...p,
    teams: Array.isArray(p.teams) && p.teams.length === 2 ? (p.teams as MatchConfig['teams']) : d.teams,
    voice: { ...d.voice, ...(isObject(p.voice) ? p.voice : {}) },
  }
}

function readJson(kv: KV, key: string): unknown {
  try {
    const raw = kv.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

function writeJson(kv: KV, key: string, value: unknown): void {
  try {
    kv.setItem(key, JSON.stringify(value))
  } catch {
    // storage blocked or full: the match keeps running in memory
  }
}

export function createStorage(kv: KV = localStorage): MatchStorage {
  return {
    loadMatch() {
      const v = readJson(kv, MATCH_KEY)
      if (!isObject(v) || !Array.isArray(v.events)) return null
      return { config: mergeConfig(v.config), events: v.events as MatchEvent[] }
    },
    saveMatch(m) {
      writeJson(kv, MATCH_KEY, m)
    },
    clearMatch() {
      try {
        kv.removeItem(MATCH_KEY)
      } catch {
        // ignore
      }
    },
    loadLastConfig() {
      return mergeConfig(readJson(kv, CONFIG_KEY))
    },
    saveLastConfig(c) {
      writeJson(kv, CONFIG_KEY, c)
    },
  }
}

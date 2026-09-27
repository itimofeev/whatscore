import type { Lang, Team } from '../domain/types'

export type Command = { type: 'point'; team: Team } | { type: 'undo' } | { type: 'score' }

interface Vocab {
  point: string[]
  undo: string[]
  score: string[]
  teams: [string[], string[]]
  // what phones return for a short team name said on a noisy court
  sounds: Record<string, string[]>
}

const VOCAB: Record<Lang, Vocab> = {
  en: {
    point: ['point', 'find', 'coin', 'pint', 'joint'],
    undo: ['undo', 'cancel'],
    score: ['score'],
    teams: [
      ['one', '1', 'first'],
      ['two', '2', 'second'],
    ],
    sounds: {
      red: ['thread', 'bread', 'wed', 'rat', 'ride', 'rid'],
      blue: ['bloom', 'blew', 'blu', 'bloo', 'glue', 'blow', 'bluetooth'],
    },
  },
  ru: {
    point: ['очко'],
    undo: ['отмена', 'отменить', 'отмени'],
    score: ['счёт', 'счет'],
    teams: [
      ['первым', 'первой', 'первая', 'первые', 'один', '1'],
      ['вторым', 'второй', 'вторая', 'вторые', 'два', '2'],
    ],
    sounds: {},
  },
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
}

function stem(word: string): string {
  return word.slice(0, Math.max(3, word.length - 2))
}

function hasAny(ws: string[], keys: string[]): boolean {
  return ws.some((w) => keys.includes(w))
}

// 'pointed', 'redpoint', 'pint' still mean the keyword
function hasKeyword(ws: string[], keys: string[]): boolean {
  return ws.some((w) => keys.some((k) => w.includes(k) || editDistance(w, k) <= 1))
}

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

// speech recognition returns homophones ('read', 'thread' for 'red') and glues words ('redpoint'),
// so names of 3+ letters match inside a word, within one edit, or through the known mishearings
function similar(word: string, name: string, sounds: string[]): boolean {
  if (word.startsWith(stem(name))) return true
  if (name.length < 3) return false
  return word.includes(name) || editDistance(word, name) <= 1 || sounds.includes(word)
}

function mentioned(ws: string[], nameWords: string[], aliases: string[], v: Vocab): boolean {
  const names = nameWords.filter((w) => w.length >= 2)
  return ws.some((w) => aliases.includes(w) || names.some((n) => similar(w, n, v.sounds[n] ?? [])))
}

export function parseCommand(transcript: string, teamNames: [string, string], lang: Lang): Command | null {
  const v = VOCAB[lang]
  const ws = words(transcript)
  if (ws.length === 0) return null
  if (hasAny(ws, v.undo)) return { type: 'undo' }
  if (hasAny(ws, v.score)) return { type: 'score' }
  if (!hasKeyword(ws, v.point)) return null

  const nameWords = teamNames.map(words) as [string[], string[]]
  const distinct: [string[], string[]] = [
    nameWords[0].filter((w) => !nameWords[1].includes(w)),
    nameWords[1].filter((w) => !nameWords[0].includes(w)),
  ]
  const hits = ([0, 1] as const).filter((t) => mentioned(ws, distinct[t], v.teams[t], v))
  if (hits.length !== 1) return null
  return { type: 'point', team: hits[0] }
}

import type { Lang, Team } from '../domain/types'

export type Command = { type: 'point'; team: Team } | { type: 'undo' } | { type: 'score' }

const VOCAB: Record<Lang, { point: string[]; undo: string[]; score: string[]; teams: [string[], string[]] }> = {
  en: {
    point: ['point'],
    undo: ['undo', 'cancel'],
    score: ['score'],
    teams: [
      ['one', '1', 'first'],
      ['two', '2', 'second'],
    ],
  },
  ru: {
    point: ['очко'],
    undo: ['отмена', 'отменить', 'отмени'],
    score: ['счёт', 'счет'],
    teams: [
      ['первым', 'первой', 'первая', 'первые', 'один', '1'],
      ['вторым', 'второй', 'вторая', 'вторые', 'два', '2'],
    ],
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

// 'pointed', 'points', 'очков' still mean the keyword
function hasKeyword(ws: string[], keys: string[]): boolean {
  return ws.some((w) => keys.some((k) => w.startsWith(k)))
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

// speech recognition returns homophones ('read' for 'red'), so one edit is tolerated on names of 3+ letters
function similar(word: string, name: string): boolean {
  if (word.startsWith(stem(name))) return true
  return name.length >= 3 && editDistance(word, name) <= 1
}

function mentioned(ws: string[], nameWords: string[], aliases: string[]): boolean {
  const names = nameWords.filter((w) => w.length >= 2)
  return ws.some((w) => aliases.includes(w) || names.some((n) => similar(w, n)))
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
  const hits = ([0, 1] as const).filter((t) => mentioned(ws, distinct[t], v.teams[t]))
  if (hits.length !== 1) return null
  return { type: 'point', team: hits[0] }
}

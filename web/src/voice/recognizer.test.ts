// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

interface FakeRec {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: unknown) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

let starts = 0
let failWith: string | null = 'network'
let throwOnStart = 0
const instances: FakeRecognition[] = []

class FakeRecognition implements FakeRec {
  lang = ''
  continuous = false
  interimResults = false
  onresult: ((e: unknown) => void) | null = null
  onend: (() => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  maxAlternatives = 1
  constructor() {
    instances.push(this)
  }
  start() {
    starts++
    if (throwOnStart > 0) {
      throwOnStart--
      throw new Error('recognition has already started')
    }
    // Chrome offline: 'network' error then 'end' right away
    setTimeout(() => {
      if (failWith) this.onerror?.({ error: failWith })
      this.onend?.()
    }, 0)
  }
  abort() {}
}

beforeEach(() => {
  vi.useFakeTimers()
  starts = 0
  failWith = 'network'
  throwOnStart = 0
  instances.length = 0
  Object.assign(window, { webkitSpeechRecognition: FakeRecognition })
})

afterEach(() => vi.useRealTimers())

test('restarts back off exponentially after network errors', async () => {
  const { Recognizer } = await import('./recognizer')
  const r = new Recognizer('en', () => undefined, () => undefined)
  r.start()
  await vi.advanceTimersByTimeAsync(3000)
  // fixed 300 ms restarts would give ~10 starts; backoff 300/600/1200/2400 gives 4
  expect(starts).toBeLessThanOrEqual(5)
  expect(starts).toBeGreaterThanOrEqual(3)
  r.stop()
})

test('restarts quickly again once recognition succeeds', async () => {
  const { Recognizer } = await import('./recognizer')
  const r = new Recognizer('en', () => undefined, () => undefined)
  r.start()
  await vi.advanceTimersByTimeAsync(3000)
  const afterFailures = starts
  failWith = null
  await vi.advanceTimersByTimeAsync(5000)
  const quiet = starts
  // a success resets the delay: the following restarts come every ~300 ms
  await vi.advanceTimersByTimeAsync(3000)
  expect(starts - quiet).toBeGreaterThanOrEqual(8)
  expect(quiet).toBeGreaterThan(afterFailures)
  r.stop()
})

test('stop prevents any further restart', async () => {
  const { Recognizer } = await import('./recognizer')
  const r = new Recognizer('en', () => undefined, () => undefined)
  r.start()
  r.stop()
  await vi.advanceTimersByTimeAsync(10000)
  expect(starts).toBe(1)
})

test('passes every alternative of a final result', async () => {
  failWith = null
  const { Recognizer } = await import('./recognizer')
  const heard: string[][] = []
  const r = new Recognizer('en', (alts) => heard.push(alts), () => undefined)
  r.start()
  const rec = instances[0]
  expect(rec.maxAlternatives).toBeGreaterThan(1)
  rec.onresult?.({
    resultIndex: 0,
    results: [{ isFinal: true, length: 2, 0: { transcript: 'point read' }, 1: { transcript: 'point red' } }],
  })
  expect(heard).toEqual([['point read', 'point red']])
  r.stop()
})

test('a start() that throws is retried instead of leaving a dead recognizer', async () => {
  failWith = null
  throwOnStart = 1
  const { Recognizer } = await import('./recognizer')
  const listening: boolean[] = []
  const r = new Recognizer('en', () => undefined, (l) => listening.push(l))
  r.start()
  expect(r.active).toBe(true)
  await vi.advanceTimersByTimeAsync(1000)
  expect(starts).toBeGreaterThanOrEqual(2)
  expect(listening.at(-1)).toBe(true)
  r.stop()
})

test('a refused microphone deactivates the recognizer and reports the error', async () => {
  failWith = 'not-allowed'
  const { Recognizer } = await import('./recognizer')
  const errors: string[] = []
  const r = new Recognizer('en', () => undefined, () => undefined, (e) => errors.push(e))
  r.start()
  await vi.advanceTimersByTimeAsync(5000)
  expect(starts).toBe(1)
  expect(r.active).toBe(false)
  expect(errors).toEqual(['not-allowed'])
})

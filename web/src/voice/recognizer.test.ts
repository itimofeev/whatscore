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

class FakeRecognition implements FakeRec {
  lang = ''
  continuous = false
  interimResults = false
  onresult: ((e: unknown) => void) | null = null
  onend: (() => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  start() {
    starts++
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

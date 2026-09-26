// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

class FakeUtterance {
  lang = ''
  rate = 1
  onend: ((e: Event) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  constructor(public text: string) {}
}

const spoken: FakeUtterance[] = []

beforeEach(() => {
  vi.useFakeTimers()
  spoken.length = 0
  Object.assign(window, {
    SpeechSynthesisUtterance: FakeUtterance,
    speechSynthesis: { cancel: () => undefined, speak: (u: FakeUtterance) => void spoken.push(u) },
  })
})

afterEach(() => vi.useRealTimers())

test('speak resolves when the utterance ends', async () => {
  const { speak } = await import('./speaker')
  let done = false
  void speak('fifteen love', 'en').then(() => (done = true))
  spoken[0].onend?.(new Event('end'))
  await vi.advanceTimersByTimeAsync(0)
  expect(done).toBe(true)
})

test('speak resolves on a timeout when Chrome never fires onend', async () => {
  const { speak } = await import('./speaker')
  let done = false
  void speak('fifteen love', 'en').then(() => (done = true))
  await vi.advanceTimersByTimeAsync(1000)
  expect(done).toBe(false)
  await vi.advanceTimersByTimeAsync(2000)
  expect(done).toBe(true)
})

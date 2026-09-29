// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { defaultConfig } from './domain/types'
import { createStorage, type KV } from './storage'

class FakeUtterance {
  lang = ''
  rate = 1
  onend: ((e: Event) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  constructor(public text: string) {}
}
const spoken: FakeUtterance[] = []

let recStarts = 0
let recAborts = 0
const recs: FakeRecognition[] = []
class FakeRecognition {
  constructor() {
    recs.push(this)
  }
  lang = ''
  continuous = false
  interimResults = false
  onresult: ((e: unknown) => void) | null = null
  onend: (() => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  start() {
    recStarts++
  }
  abort() {
    recAborts++
  }
}

Object.assign(window, {
  SpeechSynthesisUtterance: FakeUtterance,
  speechSynthesis: { cancel: () => undefined, speak: (u: FakeUtterance) => void spoken.push(u) },
  webkitSpeechRecognition: FakeRecognition,
})

function memory(): KV {
  const data = new Map<string, string>()
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

function tap(root: HTMLElement, team: 0 | 1): void {
  const z = root.querySelector(`.zone.team${team}`)!
  z.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
  z.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
}

function button(root: HTMLElement, label: string): HTMLButtonElement {
  const b = [...root.querySelectorAll('button')].find((b) => b.textContent === label)
  if (!b) throw new Error(`no button "${label}"`)
  return b
}

const pts = (root: HTMLElement) => [...root.querySelectorAll('.pts')].map((e) => e.textContent)

async function bootApp(kv: KV) {
  const { App } = await import('./app')
  const root = document.createElement('div')
  document.body.append(root)
  const app = new App(root, createStorage(kv))
  app.boot()
  return { app, root }
}

beforeEach(() => {
  spoken.length = 0
  recStarts = 0
  recAborts = 0
  recs.length = 0
  document.body.innerHTML = ''
})

afterEach(() => vi.useRealTimers())

describe('settings while a match is running', () => {
  test('Back to match restores the running match', async () => {
    const { root } = await bootApp(memory())
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    tap(root, 0)
    tap(root, 0)
    expect(pts(root)).toEqual(['30', '0'])

    button(root, 'Settings').click()
    expect(root.className).toBe('setup')
    button(root, 'Back to match').click()
    expect(root.className).toBe('match')
    expect(pts(root)).toEqual(['30', '0'])
  })

  test('Start from settings begins a fresh match', async () => {
    const { root } = await bootApp(memory())
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    tap(root, 0)
    button(root, 'Settings').click()
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(pts(root)).toEqual(['0', '0'])
  })

  test('no Back to match button without a running match', async () => {
    const { root } = await bootApp(memory())
    expect([...root.querySelectorAll('button')].map((b) => b.textContent)).toEqual(['Start'])
  })
})

describe('announcements and the microphone', () => {
  function voiceKv(): KV {
    const kv = memory()
    const c = defaultConfig()
    c.voice = { enabled: true, announce: true, lang: 'en' }
    kv.setItem('whatscore.match', JSON.stringify({ config: c, events: [] }))
    return kv
  }

  test('mic resumes only after the last of overlapping announcements ends', async () => {
    vi.useFakeTimers()
    const { root } = await bootApp(voiceKv())
    expect(recStarts).toBe(1)

    tap(root, 0)
    tap(root, 0)
    await vi.advanceTimersByTimeAsync(0)
    expect(spoken.map((u) => u.text)).toEqual(['fifteen love', 'thirty love'])
    expect(recAborts).toBeGreaterThanOrEqual(1)

    spoken[0].onend?.(new Event('end'))
    await vi.advanceTimersByTimeAsync(0)
    expect(recStarts).toBe(1)

    spoken[1].onend?.(new Event('end'))
    await vi.advanceTimersByTimeAsync(0)
    expect(recStarts).toBe(2)
  })

  test('mic resumes even if the browser never ends the utterance', async () => {
    vi.useFakeTimers()
    const { root } = await bootApp(voiceKv())
    tap(root, 0)
    await vi.advanceTimersByTimeAsync(0)
    expect(recStarts).toBe(1)
    await vi.advanceTimersByTimeAsync(4000)
    expect(recStarts).toBe(2)
  })
})

describe('unrecognised speech', () => {
  test('shows what was heard so the player can adjust', async () => {
    const kv = memory()
    const c = defaultConfig()
    c.voice = { enabled: true, announce: false, lang: 'en' }
    kv.setItem('whatscore.match', JSON.stringify({ config: c, events: [] }))
    const { app, root } = await bootApp(kv)
    ;(app as unknown as { onTranscript(t: string[]): void }).onTranscript(['hello there', 'hello here'])
    expect(root.querySelector('.toast')!.textContent).toBe('Heard: hello there')
    expect(pts(root)).toEqual(['0', '0'])
  })

  test('any alternative that parses counts', async () => {
    const kv = memory()
    const c = defaultConfig()
    c.voice = { enabled: true, announce: false, lang: 'en' }
    kv.setItem('whatscore.match', JSON.stringify({ config: c, events: [] }))
    const { app, root } = await bootApp(kv)
    ;(app as unknown as { onTranscript(t: string[]): void }).onTranscript(['point rat', 'point red'])
    expect(pts(root)).toEqual(['15', '0'])
  })
})

describe('mic button', () => {
  function voiceKv(): KV {
    const kv = memory()
    const c = defaultConfig()
    c.voice = { enabled: true, announce: false, lang: 'en' }
    kv.setItem('whatscore.match', JSON.stringify({ config: c, events: [] }))
    return kv
  }

  test('one tap turns the mic back on after the browser refused it', async () => {
    const { root } = await bootApp(voiceKv())
    expect(recStarts).toBe(1)
    recs.at(-1)!.onerror!({ error: 'not-allowed' })
    recs.at(-1)!.onend!()
    expect(root.querySelector('.toast')!.textContent).toBe('Mic error: not-allowed')
    expect(root.querySelector('.mic')!.textContent).toBe('🔇')
    ;(root.querySelector('.mic') as HTMLButtonElement).click()
    expect(recStarts).toBe(2)
    expect(root.querySelector('.mic')!.textContent).toBe('🎤')
  })
})

describe('center bar', () => {
  test('zones stay put after a side change and the bar names the server', async () => {
    const { root } = await bootApp(memory())
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }))
    expect(root.querySelector('.server')!.textContent).toBe('Serving◀ Red 1right court')
    for (let i = 0; i < 4; i++) tap(root, 0)
    expect(root.classList.contains('swapped')).toBe(false)
    expect(root.querySelector('.server')!.textContent).toBe('ServingBlue 1 ▶right court')
    tap(root, 1)
    expect(root.querySelector('.server')!.textContent).toBe('ServingBlue 1 ▶left court')
  })
})

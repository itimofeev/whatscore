type WakeLockSentinel = { release(): Promise<void> }
type NavWithWakeLock = Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinel> } }

let installed = false

// the sentinel is never released on purpose: the screen must stay on for the whole match
async function requestWakeLock(): Promise<void> {
  try {
    await (navigator as NavWithWakeLock).wakeLock?.request('screen')
  } catch {
    // denied or unsupported: the phone's own screen timeout applies
  }
}

export function keepScreenOn(): void {
  void requestWakeLock()
  if (installed) return
  installed = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void requestWakeLock()
  })
}

export function enterFullscreen(): void {
  const doc = document.documentElement
  try {
    void doc.requestFullscreen?.().catch(() => undefined)
  } catch {
    // not supported
  }
  try {
    const o = screen.orientation as unknown as { lock?(o: string): Promise<void> }
    void o.lock?.('landscape').catch(() => undefined)
  } catch {
    // not supported
  }
}

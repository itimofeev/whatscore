export interface PressHandlers {
  onTap(): void
  onLongPress(): void
}

export function attachPressHandlers(el: HTMLElement, h: PressHandlers, holdMs = 600): void {
  let timer: number | null = null
  let pointerId: number | null = null

  const clear = () => {
    if (timer !== null) window.clearTimeout(timer)
    timer = null
    pointerId = null
    el.classList.remove('holding')
  }

  el.addEventListener('pointerdown', (e) => {
    if (pointerId !== null) return
    pointerId = e.pointerId
    el.classList.add('holding')
    timer = window.setTimeout(() => {
      timer = null
      pointerId = null
      el.classList.remove('holding')
      h.onLongPress()
    }, holdMs)
  })

  el.addEventListener('pointerup', (e) => {
    if (e.pointerId !== pointerId) return
    const wasPending = timer !== null
    clear()
    if (wasPending) h.onTap()
  })

  el.addEventListener('pointercancel', clear)
  el.addEventListener('pointerleave', clear)
  el.addEventListener('contextmenu', (e) => e.preventDefault())
}

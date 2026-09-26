import type { Lang } from '../domain/types'

const LOCALE: Record<Lang, string> = { en: 'en-US', ru: 'ru-RU' }

export function speak(text: string, lang: Lang): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve()
      return
    }
    let done = false
    const finish = () => {
      if (done) return
      done = true
      window.clearTimeout(timer)
      resolve()
    }
    // Chrome sometimes drops onend/onerror (notably after cancel()); never leave the caller hanging
    const timer = window.setTimeout(finish, 1500 + 80 * text.length)
    const u = new SpeechSynthesisUtterance(text)
    u.lang = LOCALE[lang]
    u.rate = 1
    u.onend = finish
    u.onerror = finish
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  })
}

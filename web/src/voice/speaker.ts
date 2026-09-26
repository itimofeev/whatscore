import type { Lang } from '../domain/types'

const LOCALE: Record<Lang, string> = { en: 'en-US', ru: 'ru-RU' }

export function speak(text: string, lang: Lang): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve()
      return
    }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = LOCALE[lang]
    u.rate = 1
    u.onend = () => resolve()
    u.onerror = () => resolve()
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  })
}

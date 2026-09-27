# web

PWA-фронтенд WhatScore. Vanilla TypeScript, без UI-фреймворка.

## Команды

    npm install
    npm run dev        # http://localhost:5173/whatscore/
    npm test           # vitest
    npm run typecheck  # tsc --noEmit
    npm run build      # dist/

## Структура

| Путь | За что отвечает |
|---|---|
| `src/domain/` | Правила счёта. Чистые функции, без зависимостей. `reduce(config, events)` даёт состояние матча. |
| `src/voice/` | Разбор голосовых команд, тексты объявлений, обёртки над Web Speech API. Находки с телефона: `docs/voice.md` в корне. |
| `src/ui/` | Экран настройки, экран матча, длинное нажатие, wake lock и fullscreen. |
| `src/storage.ts` | localStorage: текущий матч и последние настройки. |
| `src/app.ts` | Контроллер: связывает домен, хранилище, экраны и голос. |
| `src/main.ts` | Точка входа. |
| `public/` | Иконки PWA. |

## Как работает счёт

Матч это `MatchConfig` плюс журнал `MatchEvent[]` (`point` / `undo`).
Состояние никогда не мутируется: `reduce` заново проходит журнал.
Отмена любой глубины и будущая синхронизация между телефонами следуют
из этого бесплатно.

## Деплой

Push в `main` собирает `web/` и публикует на GitHub Pages
(`.github/workflows/deploy.yml`). Один раз в настройках репозитория
GitHub: Settings → Pages → Source: GitHub Actions. Репозиторий должен
называться `whatscore`, потому что base path `/whatscore/`.

Адрес: `https://itimofeev.github.io/whatscore/`. На телефоне в Chrome:
меню → Add to Home screen. Установленное приложение открывается на весь
экран в горизонтальной ориентации и работает без интернета. Голосовые
команды требуют интернет.

Иконки генерируются `node scripts/make-icons.mjs`.

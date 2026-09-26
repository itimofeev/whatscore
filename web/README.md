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
| `src/voice/` | Разбор голосовых команд, тексты объявлений, обёртки над Web Speech API. |
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

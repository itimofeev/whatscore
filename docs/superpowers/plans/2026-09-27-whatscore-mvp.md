# WhatScore MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Офлайн PWA для одного телефона, которая считает счёт в паделе по касаниям и голосу, показывает подающего игрока и квадрат подачи, отменяет очко длинным нажатием.

**Architecture:** Матч это конфиг плюс журнал событий `point`/`undo`; чистая функция `reduce(config, events)` вычисляет всё состояние. UI (vanilla DOM), голос и хранилище только добавляют события и рендерят состояние. Логика правил в `web/src/domain` без зависимостей.

**Tech Stack:** TypeScript, Vite 8, Vitest 5, vite-plugin-pwa, Web Speech API, GitHub Pages через GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-27-whatscore-mvp-design.md`

## Global Constraints

- Весь фронтенд лежит в `web/`. В корне репозитория только `README.md`, `.github/`, `docs/`, `go.mod`, `.gitignore`.
- `web/src/domain` не импортирует ничего, кроме собственных файлов.
- Base path приложения `/whatscore/`.
- Интерфейс на английском. Имена команд по умолчанию `Red` и `Blue`.
- Дефолты конфига: `deuceMode: 2`, `format: 'best_of_3'`, `swapZonesWithSides: true`, `voice: { enabled: false, announce: false, lang: 'en' }`.
- Длинное нажатие для отмены: 600 мс.
- Подтверждение очка на экране: 2 секунды.
- Раскладка горизонтальная, манифест `orientation: landscape`.
- localStorage ключи: `whatscore.match`, `whatscore.lastConfig`.
- Каждый коммит завершается строкой `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Команды запускаются из `web/` (`npm test`, `npm run build`, `npm run typecheck`).

## Review Focus

1. `undo` при пустом журнале: ничего не происходит, `canUndo === false`. Тест в Task 2.
2. `point` после завершённого матча: игнорируется, состояние не меняется. Тест в Task 3.
3. Сохранённый конфиг старой схемы без части полей: подставляются дефолты, приложение не падает. Тест в Task 5.
4. Голосовой транскрипт, где названы обе команды или ни одной: команда не распознаётся, очко не начисляется. Тест в Task 6.
5. Имена команд с общим словом (`Team Red` / `Team Blue`): различаются по уникальному слову. Тест в Task 6.

---

### Task 1: Каркас `web/`, README, тесты

**Files:**
- Create: `README.md`
- Create: `web/README.md`
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/vite.config.ts`
- Create: `web/index.html`
- Create: `web/src/main.ts`
- Create: `web/src/style.css`
- Create: `web/src/smoke.test.ts`

**Interfaces:**
- Produces: скрипты `npm test`, `npm run build`, `npm run typecheck`, `npm run dev`.

- [ ] **Step 1: Создать package.json и установить зависимости**

`web/package.json`:

```json
{
  "name": "whatscore-web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Run: `cd web && npm install -D vite typescript vitest vite-plugin-pwa`
Expected: `package-lock.json` создан, `node_modules/` появился.

- [ ] **Step 2: tsconfig, vite.config, index.html, main.ts, style.css**

`web/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "strict": true,
    "noUncheckedIndexedAccess": false,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true
  },
  "include": ["src", "vite.config.ts"]
}
```

`web/vite.config.ts`:

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/whatscore/',
})
```

`web/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
    <meta name="theme-color" content="#0f172a" />
    <title>WhatScore</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`web/src/main.ts`:

```ts
import './style.css'

const root = document.getElementById('app')!
root.textContent = 'WhatScore'
```

`web/src/style.css`:

```css
:root {
  color-scheme: dark;
  --bg: #0f172a;
  --fg: #f8fafc;
  --muted: #94a3b8;
  --team0: #dc2626;
  --team1: #2563eb;
  --accent: #facc15;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #app {
  height: 100%;
  background: var(--bg);
  color: var(--fg);
  overflow: hidden;
}
```

- [ ] **Step 3: Smoke-тест**

`web/src/smoke.test.ts`:

```ts
import { expect, test } from 'vitest'

test('vitest runs', () => {
  expect(1 + 1).toBe(2)
})
```

Run: `cd web && npm test`
Expected: `1 passed`.

Run: `cd web && npm run build`
Expected: `dist/index.html` создан, ошибок нет.

- [ ] **Step 4: README в корне и в web/**

`README.md`:

```markdown
# WhatScore

Счётчик очков для падела. Телефон висит на стекле корта, игрок касанием
или голосом отмечает, кто выиграл розыгрыш. Приложение показывает счёт,
подающего игрока и квадрат подачи.

## Из чего состоит

| Папка | Что это |
|---|---|
| `web/` | Фронтенд: PWA на TypeScript и Vite. Работает офлайн на одном телефоне. |
| `docs/superpowers/specs/` | Дизайн-спеки по этапам. |
| `docs/superpowers/plans/` | Планы реализации. |
| `.github/workflows/` | Сборка и деплой `web/` на GitHub Pages. |
| `go.mod` | Зарезервировано под `server/` (синхронизация между телефонами, второй этап). |

## Запуск

См. `web/README.md`.

## Этапы

1. MVP: один телефон, офлайн, касания и голос. Спек:
   `docs/superpowers/specs/2026-09-27-whatscore-mvp-design.md`.
2. Сервер на Go: ссылка для зрителей, два телефона на одном матче.
```

`web/README.md`:

```markdown
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
```

- [ ] **Step 5: Commit**

```bash
git add README.md web/README.md web/package.json web/package-lock.json web/tsconfig.json web/vite.config.ts web/index.html web/src
git commit -m "chore: scaffold web/ with Vite, TypeScript and Vitest

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Типы домена, журнал событий, счёт в гейме с режимами deuce

**Files:**
- Create: `web/src/domain/types.ts`
- Create: `web/src/domain/events.ts`
- Create: `web/src/domain/reduce.ts`
- Create: `web/src/domain/testUtils.ts`
- Create: `web/src/domain/events.test.ts`
- Create: `web/src/domain/game.test.ts`
- Delete: `web/src/smoke.test.ts`

**Interfaces:**
- Produces: все типы из `types.ts` ниже, `defaultConfig()`, `effectivePoints(events): Team[]`, `reduce(config, events): MatchState`, тестовые помощники `pts(seq)` и `game(team)`.

- [ ] **Step 1: Типы**

`web/src/domain/types.ts`:

```ts
export type Team = 0 | 1
export type PlayerIdx = 0 | 1
export type DeuceMode = 1 | 2 | 3 | 'advantage'
export type MatchFormat = 'one_set' | 'best_of_3' | 'best_of_3_super_tb'
export type Lang = 'en' | 'ru'

export interface TeamConfig {
  name: string
  players: [string, string]
}

export interface VoiceConfig {
  enabled: boolean
  announce: boolean
  lang: Lang
}

export interface MatchConfig {
  teams: [TeamConfig, TeamConfig]
  firstServingTeam: Team
  deuceMode: DeuceMode
  format: MatchFormat
  swapZonesWithSides: boolean
  voice: VoiceConfig
}

export type MatchEvent =
  | { type: 'point'; team: Team; at: number }
  | { type: 'undo'; at: number }

export type Pts = 0 | 15 | 30 | 40 | 'AD'

export type GameScore =
  | { kind: 'game'; points: [Pts, Pts]; deuces: number }
  | { kind: 'tiebreak'; points: [number, number]; target: 7 | 10 }

export interface Server {
  team: Team
  player: PlayerIdx
  side: 'right' | 'left'
}

export interface MatchState {
  sets: Array<[number, number]>
  game: GameScore
  server: Server
  decidingPoint: boolean
  swapped: boolean
  finished: { winner: Team } | null
  canUndo: boolean
}

export function other(t: Team): Team {
  return t === 0 ? 1 : 0
}

export function defaultConfig(): MatchConfig {
  return {
    teams: [
      { name: 'Red', players: ['Red 1', 'Red 2'] },
      { name: 'Blue', players: ['Blue 1', 'Blue 2'] },
    ],
    firstServingTeam: 0,
    deuceMode: 2,
    format: 'best_of_3',
    swapZonesWithSides: true,
    voice: { enabled: false, announce: false, lang: 'en' },
  }
}
```

- [ ] **Step 2: Тест журнала событий**

`web/src/domain/testUtils.ts`:

```ts
import type { MatchEvent } from './types'

// 'A' очко команде 0, 'B' команде 1, 'U' отмена
export function pts(seq: string): MatchEvent[] {
  return [...seq].map((c, i) =>
    c === 'U' ? { type: 'undo', at: i } : { type: 'point', team: c === 'A' ? 0 : 1, at: i },
  )
}

export function game(team: 'A' | 'B'): string {
  return team.repeat(4)
}
```

`web/src/domain/events.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { effectivePoints } from './events'
import { pts } from './testUtils'

describe('effectivePoints', () => {
  test('keeps points in order', () => {
    expect(effectivePoints(pts('ABA'))).toEqual([0, 1, 0])
  })
  test('undo removes the last point', () => {
    expect(effectivePoints(pts('ABU'))).toEqual([0])
  })
  test('several undos remove several points', () => {
    expect(effectivePoints(pts('ABAUU'))).toEqual([0])
  })
  test('undo on empty log is a no-op', () => {
    expect(effectivePoints(pts('U'))).toEqual([])
    expect(effectivePoints(pts('AUU'))).toEqual([])
  })
})
```

Run: `cd web && npx vitest run src/domain/events.test.ts`
Expected: FAIL, модуль `./events` не найден.

- [ ] **Step 3: Реализовать events.ts**

`web/src/domain/events.ts`:

```ts
import type { MatchEvent, Team } from './types'

export function effectivePoints(events: MatchEvent[]): Team[] {
  const points: Team[] = []
  for (const e of events) {
    if (e.type === 'point') points.push(e.team)
    else points.pop()
  }
  return points
}
```

Run: `cd web && npx vitest run src/domain/events.test.ts`
Expected: 4 passed.

- [ ] **Step 4: Тесты счёта в гейме**

`web/src/domain/game.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { reduce } from './reduce'
import { defaultConfig, type DeuceMode } from './types'
import { pts } from './testUtils'

function cfg(deuceMode: DeuceMode) {
  return { ...defaultConfig(), deuceMode }
}

describe('game points', () => {
  test('starts at love all with undo disabled', () => {
    const s = reduce(cfg(2), [])
    expect(s.game).toEqual({ kind: 'game', points: [0, 0], deuces: 0 })
    expect(s.sets).toEqual([[0, 0]])
    expect(s.canUndo).toBe(false)
    expect(s.finished).toBeNull()
  })

  test('counts 15 30 40', () => {
    expect(reduce(cfg(2), pts('A')).game).toMatchObject({ points: [15, 0] })
    expect(reduce(cfg(2), pts('AAB')).game).toMatchObject({ points: [30, 15] })
    expect(reduce(cfg(2), pts('AAAB')).game).toMatchObject({ points: [40, 15] })
  })

  test('four points with a two point lead win the game', () => {
    const s = reduce(cfg(2), pts('AAAA'))
    expect(s.sets).toEqual([[1, 0]])
    expect(s.game).toMatchObject({ points: [0, 0] })
  })

  test('undo restores the previous score', () => {
    expect(reduce(cfg(2), pts('AAU')).game).toMatchObject({ points: [15, 0] })
    expect(reduce(cfg(2), pts('AAAAU')).sets).toEqual([[0, 0]])
    expect(reduce(cfg(2), pts('AAAAU')).game).toMatchObject({ points: [40, 0] })
  })

  test('undo on empty log keeps love all and canUndo false', () => {
    const s = reduce(cfg(2), pts('U'))
    expect(s.game).toMatchObject({ points: [0, 0] })
    expect(s.canUndo).toBe(false)
  })
})

describe('deuce modes', () => {
  test('golden point: first deuce is deciding', () => {
    const s = reduce(cfg(1), pts('AAABBB'))
    expect(s.game).toMatchObject({ points: [40, 40], deuces: 1 })
    expect(s.decidingPoint).toBe(true)
    expect(reduce(cfg(1), pts('AAABBBB')).sets).toEqual([[0, 1]])
  })

  test('mode 2: first deuce plays advantage, second deuce is deciding', () => {
    expect(reduce(cfg(2), pts('AAABBB')).decidingPoint).toBe(false)
    expect(reduce(cfg(2), pts('AAABBBA')).game).toMatchObject({ points: ['AD', 40] })
    expect(reduce(cfg(2), pts('AAABBBA')).sets).toEqual([[0, 0]])
    expect(reduce(cfg(2), pts('AAABBBAA')).sets).toEqual([[1, 0]])
    const back = reduce(cfg(2), pts('AAABBBAB'))
    expect(back.game).toMatchObject({ points: [40, 40], deuces: 2 })
    expect(back.decidingPoint).toBe(true)
    expect(reduce(cfg(2), pts('AAABBBABB')).sets).toEqual([[0, 1]])
  })

  test('star point: third deuce is deciding', () => {
    expect(reduce(cfg(3), pts('AAABBBAB')).decidingPoint).toBe(false)
    const third = reduce(cfg(3), pts('AAABBBABAB'))
    expect(third.game).toMatchObject({ deuces: 3 })
    expect(third.decidingPoint).toBe(true)
    expect(reduce(cfg(3), pts('AAABBBABABA')).sets).toEqual([[1, 0]])
  })

  test('advantage: never deciding, win by two', () => {
    const s = reduce(cfg('advantage'), pts('AAABBB' + 'AB'.repeat(5)))
    expect(s.decidingPoint).toBe(false)
    expect(s.sets).toEqual([[0, 0]])
    expect(reduce(cfg('advantage'), pts('AAABBB' + 'AB'.repeat(5) + 'BB')).sets).toEqual([[0, 1]])
  })

  test('advantage scoring shows AD for the leader', () => {
    expect(reduce(cfg('advantage'), pts('AAABBBB')).game).toMatchObject({ points: [40, 'AD'] })
  })
})
```

Run: `cd web && npx vitest run src/domain/game.test.ts`
Expected: FAIL, модуль `./reduce` не найден.

- [ ] **Step 5: Реализовать reduce.ts (гейм, без сетов и подачи)**

`web/src/domain/reduce.ts`:

```ts
import { effectivePoints } from './events'
import {
  other,
  type DeuceMode,
  type GameScore,
  type MatchConfig,
  type MatchEvent,
  type MatchState,
  type Pts,
  type Server,
  type Team,
} from './types'

interface Internal {
  sets: Array<[number, number]>
  points: [number, number]
  deuces: number
  tiebreak: { points: [number, number]; target: 7 | 10 } | null
  gameIndex: number
  sideChanges: number
  finished: Team | null
}

function isDeciding(s: Internal, mode: DeuceMode): boolean {
  if (s.tiebreak || mode === 'advantage') return false
  return s.points[0] === s.points[1] && s.points[0] >= 3 && s.deuces >= mode
}

function applyPoint(s: Internal, team: Team, config: MatchConfig): void {
  if (s.finished !== null) return
  const deciding = isDeciding(s, config.deuceMode)
  s.points[team]++
  if (s.points[0] === s.points[1] && s.points[0] >= 3) s.deuces++
  const won = deciding || (s.points[team] >= 4 && s.points[team] - s.points[other(team)] >= 2)
  if (won) gameWon(s, team)
}

function gameWon(s: Internal, team: Team): void {
  s.points = [0, 0]
  s.deuces = 0
  s.gameIndex++
  s.sets[s.sets.length - 1][team]++
}

function toPts(mine: number, theirs: number): Pts {
  if (mine >= 3 && theirs >= 3) return mine > theirs ? 'AD' : 40
  return ([0, 15, 30, 40] as const)[Math.min(mine, 3)]
}

function serverOf(s: Internal, config: MatchConfig): Server {
  const total = s.points[0] + s.points[1]
  return { team: config.firstServingTeam, player: 0, side: total % 2 === 0 ? 'right' : 'left' }
}

export function reduce(config: MatchConfig, events: MatchEvent[]): MatchState {
  const points = effectivePoints(events)
  const s: Internal = {
    sets: [[0, 0]],
    points: [0, 0],
    deuces: 0,
    tiebreak: null,
    gameIndex: 0,
    sideChanges: 0,
    finished: null,
  }
  for (const t of points) applyPoint(s, t, config)

  const game: GameScore = s.tiebreak
    ? { kind: 'tiebreak', points: [s.tiebreak.points[0], s.tiebreak.points[1]], target: s.tiebreak.target }
    : {
        kind: 'game',
        points: [toPts(s.points[0], s.points[1]), toPts(s.points[1], s.points[0])],
        deuces: s.deuces,
      }

  return {
    sets: s.sets.map(([a, b]) => [a, b]),
    game,
    server: serverOf(s, config),
    decidingPoint: isDeciding(s, config.deuceMode),
    swapped: s.sideChanges % 2 === 1,
    finished: s.finished === null ? null : { winner: s.finished },
    canUndo: points.length > 0,
  }
}
```

Run: `cd web && npm test`
Expected: все тесты `events.test.ts` и `game.test.ts` проходят. `smoke.test.ts` удалить: `rm web/src/smoke.test.ts`.

Run: `cd web && npm run typecheck`
Expected: ошибок нет.

- [ ] **Step 6: Commit**

```bash
git add web/src/domain
git rm -q web/src/smoke.test.ts
git commit -m "feat(domain): event log and game scoring with deuce modes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Сеты, тай-брейк, форматы матча, завершение

**Files:**
- Modify: `web/src/domain/reduce.ts` (функции `applyPoint`, `gameWon`, добавить `applyTiebreakPoint`, `setsWon`)
- Create: `web/src/domain/match.test.ts`

**Interfaces:**
- Consumes: `reduce`, `pts`, `game`.
- Produces: полностью рабочий счёт по сетам; `MatchState.finished`, `game.kind === 'tiebreak'`.

- [ ] **Step 1: Тесты**

`web/src/domain/match.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { reduce } from './reduce'
import { defaultConfig, type MatchFormat } from './types'
import { game, pts } from './testUtils'

function cfg(format: MatchFormat = 'best_of_3') {
  return { ...defaultConfig(), format }
}

const A = game('A')
const B = game('B')
const setA = A.repeat(6)
const setB = B.repeat(6)
const sixAll = (A + B).repeat(6)

describe('sets', () => {
  test('six games with a two game lead win the set', () => {
    const s = reduce(cfg(), pts(A.repeat(5) + B.repeat(4) + A))
    expect(s.sets).toEqual([[6, 4], [0, 0]])
  })

  test('at 5:5 the set goes on to 7:5', () => {
    expect(reduce(cfg(), pts((A + B).repeat(5) + A)).sets).toEqual([[6, 5]])
    expect(reduce(cfg(), pts((A + B).repeat(5) + A + A)).sets).toEqual([[7, 5], [0, 0]])
  })

  test('6:6 starts a tiebreak to 7', () => {
    const s = reduce(cfg(), pts(sixAll))
    expect(s.sets).toEqual([[6, 6]])
    expect(s.game).toEqual({ kind: 'tiebreak', points: [0, 0], target: 7 })
  })

  test('tiebreak is won at 7 with a two point lead and the set is 7:6', () => {
    expect(reduce(cfg(), pts(sixAll + 'AAAAAA')).game).toMatchObject({ points: [6, 0] })
    expect(reduce(cfg(), pts(sixAll + 'AAAAAAA')).sets).toEqual([[7, 6], [0, 0]])
    const tight = reduce(cfg(), pts(sixAll + 'AAAAAABBBBBB'))
    expect(tight.game).toMatchObject({ kind: 'tiebreak', points: [6, 6] })
    expect(reduce(cfg(), pts(sixAll + 'AAAAAABBBBBBA')).game).toMatchObject({ points: [7, 6] })
    // 8:6 in the tiebreak is still recorded as a 7:6 set
    expect(reduce(cfg(), pts(sixAll + 'AAAAAABBBBBBAA')).sets).toEqual([[7, 6], [0, 0]])
  })

  test('undo inside a tiebreak', () => {
    expect(reduce(cfg(), pts(sixAll + 'AAU')).game).toMatchObject({ kind: 'tiebreak', points: [1, 0] })
    expect(reduce(cfg(), pts(sixAll + 'AAAAAAAU')).sets).toEqual([[6, 6]])
  })
})

describe('match formats', () => {
  test('one_set finishes after one set', () => {
    const s = reduce(cfg('one_set'), pts(setA))
    expect(s.finished).toEqual({ winner: 0 })
    expect(s.sets).toEqual([[6, 0]])
  })

  test('best_of_3 needs two sets', () => {
    expect(reduce(cfg(), pts(setA)).finished).toBeNull()
    expect(reduce(cfg(), pts(setA + setB)).sets).toEqual([[6, 0], [0, 6], [0, 0]])
    const s = reduce(cfg(), pts(setA + setB + setB))
    expect(s.finished).toEqual({ winner: 1 })
    expect(s.sets).toEqual([[6, 0], [0, 6], [0, 6]])
  })

  test('best_of_3_super_tb plays a tiebreak to 10 at one set all', () => {
    const s = reduce(cfg('best_of_3_super_tb'), pts(setA + setB))
    expect(s.sets).toEqual([[6, 0], [0, 6], [0, 0]])
    expect(s.game).toEqual({ kind: 'tiebreak', points: [0, 0], target: 10 })
    expect(reduce(cfg('best_of_3_super_tb'), pts(setA + setB + 'A'.repeat(9))).finished).toBeNull()
    const done = reduce(cfg('best_of_3_super_tb'), pts(setA + setB + 'A'.repeat(10)))
    expect(done.finished).toEqual({ winner: 0 })
    expect(done.sets).toEqual([[6, 0], [0, 6], [1, 0]])
  })

  test('best_of_3_super_tb without a decider is a normal best of three', () => {
    expect(reduce(cfg('best_of_3_super_tb'), pts(setA + setA)).finished).toEqual({ winner: 0 })
  })

  test('points after the match is finished are ignored', () => {
    const done = reduce(cfg('one_set'), pts(setA))
    const extra = reduce(cfg('one_set'), pts(setA + 'BBBB'))
    expect(extra.sets).toEqual(done.sets)
    expect(extra.game).toEqual(done.game)
    expect(extra.finished).toEqual(done.finished)
  })

  test('undo reopens a finished match', () => {
    const s = reduce(cfg('one_set'), pts(setA + 'U'))
    expect(s.finished).toBeNull()
    expect(s.sets).toEqual([[5, 0]])
    expect(s.game).toMatchObject({ points: [40, 0] })
  })
})
```

Run: `cd web && npx vitest run src/domain/match.test.ts`
Expected: FAIL. Сеты не завершаются, тай-брейк не начинается, `finished` всегда null.

- [ ] **Step 2: Реализация**

В `web/src/domain/reduce.ts` заменить `applyPoint` и `gameWon` на:

```ts
function applyPoint(s: Internal, team: Team, config: MatchConfig): void {
  if (s.finished !== null) return
  if (s.tiebreak) {
    applyTiebreakPoint(s, team, config)
    return
  }
  const deciding = isDeciding(s, config.deuceMode)
  s.points[team]++
  if (s.points[0] === s.points[1] && s.points[0] >= 3) s.deuces++
  const won = deciding || (s.points[team] >= 4 && s.points[team] - s.points[other(team)] >= 2)
  if (won) gameWon(s, team, config)
}

function applyTiebreakPoint(s: Internal, team: Team, config: MatchConfig): void {
  const tb = s.tiebreak!
  tb.points[team]++
  const won = tb.points[team] >= tb.target && tb.points[team] - tb.points[other(team)] >= 2
  if (won) {
    gameWon(s, team, config)
    return
  }
  const total = tb.points[0] + tb.points[1]
  if (total % 6 === 0) s.sideChanges++
}

function setsWon(s: Internal, team: Team): number {
  return s.sets.filter((set) => set[team] > set[other(team)]).length
}

function gameWon(s: Internal, team: Team, config: MatchConfig): void {
  const wasTiebreak = s.tiebreak !== null
  s.tiebreak = null
  s.points = [0, 0]
  s.deuces = 0
  s.gameIndex++
  const set = s.sets[s.sets.length - 1]
  set[team]++

  const setWon = wasTiebreak || (set[team] >= 6 && set[team] - set[other(team)] >= 2)
  if (setWon) {
    const need = config.format === 'one_set' ? 1 : 2
    if (setsWon(s, team) >= need) {
      s.finished = team
      return
    }
  }
  if ((set[0] + set[1]) % 2 === 1) s.sideChanges++
  if (!setWon) {
    if (set[0] === 6 && set[1] === 6) s.tiebreak = { points: [0, 0], target: 7 }
    return
  }
  s.sets.push([0, 0])
  if (config.format === 'best_of_3_super_tb' && setsWon(s, 0) === 1 && setsWon(s, 1) === 1) {
    s.tiebreak = { points: [0, 0], target: 10 }
  }
}
```

Смена сторон в тай-брейке: после выигрышного очка правило «каждые 6 очков» не применяется, потому что смена уже учтена как конец гейма с нечётной суммой (13 геймов). Это намеренно.

Run: `cd web && npm test`
Expected: все тесты проходят.

- [ ] **Step 3: Commit**

```bash
git add web/src/domain
git commit -m "feat(domain): sets, tiebreaks, match formats and finish

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Ротация подачи, квадрат, смена сторон

**Files:**
- Modify: `web/src/domain/reduce.ts` (`serverOf`, добавить `rotation`)
- Create: `web/src/domain/serve.test.ts`

**Interfaces:**
- Produces: корректные `MatchState.server` и `MatchState.swapped`.

- [ ] **Step 1: Тесты**

`web/src/domain/serve.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { reduce } from './reduce'
import { defaultConfig, type Team } from './types'
import { game, pts } from './testUtils'

function cfg(firstServingTeam: Team = 0) {
  return { ...defaultConfig(), firstServingTeam }
}

const A = game('A')
const B = game('B')
const sixAll = (A + B).repeat(6)

describe('server rotation', () => {
  test('first serving team player 0 serves the first game from the right', () => {
    expect(reduce(cfg(0), []).server).toEqual({ team: 0, player: 0, side: 'right' })
    expect(reduce(cfg(1), []).server).toEqual({ team: 1, player: 0, side: 'right' })
  })

  test('side alternates with every point', () => {
    expect(reduce(cfg(), pts('A')).server.side).toBe('left')
    expect(reduce(cfg(), pts('AB')).server.side).toBe('right')
    expect(reduce(cfg(), pts('ABA')).server.side).toBe('left')
  })

  test('rotation T1p0, T2p0, T1p1, T2p1 across games', () => {
    expect(reduce(cfg(), pts(A)).server).toMatchObject({ team: 1, player: 0 })
    expect(reduce(cfg(), pts(A + B)).server).toMatchObject({ team: 0, player: 1 })
    expect(reduce(cfg(), pts(A + B + A)).server).toMatchObject({ team: 1, player: 1 })
    expect(reduce(cfg(), pts(A + B + A + B)).server).toMatchObject({ team: 0, player: 0 })
  })

  test('rotation continues into the next set', () => {
    // 6 games: next index is 6 % 4 = 2 -> team 0 player 1
    expect(reduce(cfg(), pts(A.repeat(6))).server).toMatchObject({ team: 0, player: 1 })
  })

  test('tiebreak: one point, then two points each, side by point parity', () => {
    // 12 games played -> rotation index 0 serves point 0
    expect(reduce(cfg(), pts(sixAll)).server).toEqual({ team: 0, player: 0, side: 'right' })
    expect(reduce(cfg(), pts(sixAll + 'A')).server).toEqual({ team: 1, player: 0, side: 'left' })
    expect(reduce(cfg(), pts(sixAll + 'AB')).server).toEqual({ team: 1, player: 0, side: 'right' })
    expect(reduce(cfg(), pts(sixAll + 'ABA')).server).toEqual({ team: 0, player: 1, side: 'left' })
    expect(reduce(cfg(), pts(sixAll + 'ABAB')).server).toEqual({ team: 0, player: 1, side: 'right' })
    expect(reduce(cfg(), pts(sixAll + 'ABABA')).server).toEqual({ team: 1, player: 1, side: 'left' })
    expect(reduce(cfg(), pts(sixAll + 'ABABABA')).server).toEqual({ team: 0, player: 0, side: 'left' })
  })

  test('after a tiebreak the other team serves the next set with its next player', () => {
    // tiebreak counts as game 12; next set starts at index 13 % 4 = 1
    expect(reduce(cfg(), pts(sixAll + 'AAAAAAA')).server).toEqual({ team: 1, player: 0, side: 'right' })
  })
})

describe('side changes', () => {
  test('after games 1, 3, 5 of a set', () => {
    expect(reduce(cfg(), []).swapped).toBe(false)
    expect(reduce(cfg(), pts(A)).swapped).toBe(true)
    expect(reduce(cfg(), pts(A + B)).swapped).toBe(true)
    expect(reduce(cfg(), pts(A + B + A)).swapped).toBe(false)
  })

  test('a 6:0 set has three changes and the next set restarts the count', () => {
    expect(reduce(cfg(), pts(A.repeat(6))).swapped).toBe(true)
    expect(reduce(cfg(), pts(A.repeat(7))).swapped).toBe(false)
  })

  test('tiebreak changes every six points, and at the end of the set', () => {
    expect(reduce(cfg(), pts(sixAll)).swapped).toBe(false)
    expect(reduce(cfg(), pts(sixAll + 'AAABBB')).swapped).toBe(true)
    expect(reduce(cfg(), pts(sixAll + 'AAABBBAAABB')).swapped).toBe(true)
    // 7:5 in the tiebreak: 12 points, set ends at 13 games -> one more change, not two
    expect(reduce(cfg(), pts(sixAll + 'AAABBBAAABBA')).swapped).toBe(false)
  })

  test('no side change is recorded on the final point of the match', () => {
    const s = reduce({ ...cfg(), format: 'one_set' }, pts(A.repeat(6)))
    expect(s.finished).toEqual({ winner: 0 })
    expect(s.swapped).toBe(true) // 3 changes after games 1, 3, 5 and none after game 6
  })
})
```

Run: `cd web && npx vitest run src/domain/serve.test.ts`
Expected: FAIL на ротации и квадрате (сейчас `serverOf` возвращает константу).

- [ ] **Step 2: Реализовать serverOf**

В `web/src/domain/reduce.ts` заменить `serverOf` на:

```ts
function rotation(config: MatchConfig): Array<{ team: Team; player: 0 | 1 }> {
  const f = config.firstServingTeam
  const o = other(f)
  return [
    { team: f, player: 0 },
    { team: o, player: 0 },
    { team: f, player: 1 },
    { team: o, player: 1 },
  ]
}

function serverOf(s: Internal, config: MatchConfig): Server {
  let idx = s.gameIndex
  let total: number
  if (s.tiebreak) {
    total = s.tiebreak.points[0] + s.tiebreak.points[1]
    idx += total === 0 ? 0 : 1 + Math.floor((total - 1) / 2)
  } else {
    total = s.points[0] + s.points[1]
  }
  const { team, player } = rotation(config)[idx % 4]
  return { team, player, side: total % 2 === 0 ? 'right' : 'left' }
}
```

Run: `cd web && npm test && npm run typecheck`
Expected: всё проходит.

- [ ] **Step 3: Commit**

```bash
git add web/src/domain
git commit -m "feat(domain): serve rotation, serving side and side changes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Хранилище

**Files:**
- Create: `web/src/storage.ts`
- Create: `web/src/storage.test.ts`

**Interfaces:**
- Consumes: `MatchConfig`, `MatchEvent`, `defaultConfig`.
- Produces:
  ```ts
  interface StoredMatch { config: MatchConfig; events: MatchEvent[] }
  interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
  interface MatchStorage { loadMatch(): StoredMatch | null; saveMatch(m: StoredMatch): void; clearMatch(): void; loadLastConfig(): MatchConfig; saveLastConfig(c: MatchConfig): void }
  function createStorage(kv?: KV): MatchStorage
  function mergeConfig(partial: unknown): MatchConfig
  ```

- [ ] **Step 1: Тесты**

`web/src/storage.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { createStorage, mergeConfig, type KV } from './storage'
import { defaultConfig } from './domain/types'

function memory(): KV & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  }
}

describe('storage', () => {
  test('saves and loads the current match', () => {
    const st = createStorage(memory())
    const match = { config: defaultConfig(), events: [{ type: 'point' as const, team: 0 as const, at: 1 }] }
    st.saveMatch(match)
    expect(st.loadMatch()).toEqual(match)
  })

  test('clearMatch removes the match', () => {
    const st = createStorage(memory())
    st.saveMatch({ config: defaultConfig(), events: [] })
    st.clearMatch()
    expect(st.loadMatch()).toBeNull()
  })

  test('corrupted json yields null and defaults', () => {
    const kv = memory()
    kv.setItem('whatscore.match', '{oops')
    kv.setItem('whatscore.lastConfig', '[1,2')
    const st = createStorage(kv)
    expect(st.loadMatch()).toBeNull()
    expect(st.loadLastConfig()).toEqual(defaultConfig())
  })

  test('throwing storage is tolerated', () => {
    const kv: KV = {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
      removeItem: () => { throw new Error('blocked') },
    }
    const st = createStorage(kv)
    expect(() => st.saveMatch({ config: defaultConfig(), events: [] })).not.toThrow()
    expect(st.loadMatch()).toBeNull()
    expect(st.loadLastConfig()).toEqual(defaultConfig())
  })

  test('lastConfig from an older schema is merged with defaults', () => {
    const kv = memory()
    kv.setItem('whatscore.lastConfig', JSON.stringify({ deuceMode: 3, voice: { enabled: true } }))
    const st = createStorage(kv)
    const c = st.loadLastConfig()
    expect(c.deuceMode).toBe(3)
    expect(c.voice).toEqual({ enabled: true, announce: false, lang: 'en' })
    expect(c.teams).toEqual(defaultConfig().teams)
  })

  test('a stored match with a partial config is merged too', () => {
    const kv = memory()
    kv.setItem('whatscore.match', JSON.stringify({ config: { format: 'one_set' }, events: [] }))
    const m = createStorage(kv).loadMatch()
    expect(m?.config.format).toBe('one_set')
    expect(m?.config.teams[1].name).toBe('Blue')
  })

  test('mergeConfig ignores non-objects', () => {
    expect(mergeConfig(null)).toEqual(defaultConfig())
    expect(mergeConfig('x')).toEqual(defaultConfig())
  })
})
```

Run: `cd web && npx vitest run src/storage.test.ts`
Expected: FAIL, модуль `./storage` не найден.

- [ ] **Step 2: Реализация**

`web/src/storage.ts`:

```ts
import { defaultConfig, type MatchConfig, type MatchEvent } from './domain/types'

export interface StoredMatch {
  config: MatchConfig
  events: MatchEvent[]
}

export interface KV {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
}

export interface MatchStorage {
  loadMatch(): StoredMatch | null
  saveMatch(m: StoredMatch): void
  clearMatch(): void
  loadLastConfig(): MatchConfig
  saveLastConfig(c: MatchConfig): void
}

const MATCH_KEY = 'whatscore.match'
const CONFIG_KEY = 'whatscore.lastConfig'

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export function mergeConfig(partial: unknown): MatchConfig {
  const d = defaultConfig()
  if (!isObject(partial)) return d
  const p = partial as Partial<MatchConfig>
  return {
    ...d,
    ...p,
    teams: Array.isArray(p.teams) && p.teams.length === 2 ? (p.teams as MatchConfig['teams']) : d.teams,
    voice: { ...d.voice, ...(isObject(p.voice) ? p.voice : {}) },
  }
}

function readJson(kv: KV, key: string): unknown {
  try {
    const raw = kv.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}

function writeJson(kv: KV, key: string, value: unknown): void {
  try {
    kv.setItem(key, JSON.stringify(value))
  } catch {
    // storage blocked or full: the match keeps running in memory
  }
}

export function createStorage(kv: KV = localStorage): MatchStorage {
  return {
    loadMatch() {
      const v = readJson(kv, MATCH_KEY)
      if (!isObject(v) || !Array.isArray(v.events)) return null
      return { config: mergeConfig(v.config), events: v.events as MatchEvent[] }
    },
    saveMatch(m) {
      writeJson(kv, MATCH_KEY, m)
    },
    clearMatch() {
      try {
        kv.removeItem(MATCH_KEY)
      } catch {
        // ignore
      }
    },
    loadLastConfig() {
      return mergeConfig(readJson(kv, CONFIG_KEY))
    },
    saveLastConfig(c) {
      writeJson(kv, CONFIG_KEY, c)
    },
  }
}
```

Run: `cd web && npm test && npm run typecheck`
Expected: всё проходит.

- [ ] **Step 3: Commit**

```bash
git add web/src/storage.ts web/src/storage.test.ts
git commit -m "feat: localStorage persistence for match and last config

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Разбор голосовых команд

**Files:**
- Create: `web/src/voice/commands.ts`
- Create: `web/src/voice/commands.test.ts`

**Interfaces:**
- Produces:
  ```ts
  type Command = { type: 'point'; team: Team } | { type: 'undo' } | { type: 'score' }
  function parseCommand(transcript: string, teamNames: [string, string], lang: Lang): Command | null
  ```

- [ ] **Step 1: Тесты**

`web/src/voice/commands.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { parseCommand } from './commands'

const names: [string, string] = ['Red', 'Blue']

describe('english commands', () => {
  test.each([
    ['point red', { type: 'point', team: 0 }],
    ['Point Blue.', { type: 'point', team: 1 }],
    ['blue point', { type: 'point', team: 1 }],
    ["red's point", { type: 'point', team: 0 }],
    ['point one', { type: 'point', team: 0 }],
    ['point two', { type: 'point', team: 1 }],
    ['point 2', { type: 'point', team: 1 }],
    ['undo', { type: 'undo' }],
    ['undo that', { type: 'undo' }],
    ['cancel', { type: 'undo' }],
    ['score', { type: 'score' }],
    ["what's the score", { type: 'score' }],
  ])('%s', (text, expected) => {
    expect(parseCommand(text, names, 'en')).toEqual(expected)
  })

  test.each(['hello there', 'red', 'point', 'point red blue', 'point green', ''])(
    'no command in "%s"',
    (text) => {
      expect(parseCommand(text, names, 'en')).toBeNull()
    },
  )

  test('names sharing a word are told apart by the distinctive word', () => {
    const teams: [string, string] = ['Team Red', 'Team Blue']
    expect(parseCommand('point team blue', teams, 'en')).toEqual({ type: 'point', team: 1 })
    expect(parseCommand('point team', teams, 'en')).toBeNull()
  })

  test('name prefix matches inflected forms', () => {
    const teams: [string, string] = ['Ilya', 'Andreas']
    expect(parseCommand('point ilyas', teams, 'en')).toEqual({ type: 'point', team: 0 })
  })
})

describe('russian commands', () => {
  const ru: [string, string] = ['Красные', 'Синие']
  test.each([
    ['очко красным', { type: 'point', team: 0 }],
    ['синие очко', { type: 'point', team: 1 }],
    ['очко первым', { type: 'point', team: 0 }],
    ['очко вторым', { type: 'point', team: 1 }],
    ['отмена', { type: 'undo' }],
    ['отменить', { type: 'undo' }],
    ['счёт', { type: 'score' }],
    ['какой счет', { type: 'score' }],
  ])('%s', (text, expected) => {
    expect(parseCommand(text, ru, 'ru')).toEqual(expected)
  })

  test('russian keyword with english team names', () => {
    expect(parseCommand('очко ред', ['Ред', 'Блю'], 'ru')).toEqual({ type: 'point', team: 0 })
  })
})
```

Run: `cd web && npx vitest run src/voice/commands.test.ts`
Expected: FAIL, модуль `./commands` не найден.

- [ ] **Step 2: Реализация**

`web/src/voice/commands.ts`:

```ts
import type { Lang, Team } from '../domain/types'

export type Command = { type: 'point'; team: Team } | { type: 'undo' } | { type: 'score' }

const VOCAB: Record<Lang, { point: string[]; undo: string[]; score: string[]; teams: [string[], string[]] }> = {
  en: {
    point: ['point'],
    undo: ['undo', 'cancel'],
    score: ['score'],
    teams: [
      ['one', '1', 'first'],
      ['two', '2', 'second'],
    ],
  },
  ru: {
    point: ['очко'],
    undo: ['отмена', 'отменить', 'отмени'],
    score: ['счёт', 'счет'],
    teams: [
      ['первым', 'первой', 'первая', 'первые', 'один', '1'],
      ['вторым', 'второй', 'вторая', 'вторые', 'два', '2'],
    ],
  },
}

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter(Boolean)
}

function stem(word: string): string {
  return word.slice(0, Math.max(3, word.length - 2))
}

function hasAny(ws: string[], keys: string[]): boolean {
  return ws.some((w) => keys.includes(w))
}

function mentioned(ws: string[], nameWords: string[], aliases: string[]): boolean {
  const stems = nameWords.filter((w) => w.length >= 2).map(stem)
  return ws.some((w) => aliases.includes(w) || stems.some((s) => w.startsWith(s)))
}

export function parseCommand(transcript: string, teamNames: [string, string], lang: Lang): Command | null {
  const v = VOCAB[lang]
  const ws = words(transcript)
  if (ws.length === 0) return null
  if (hasAny(ws, v.undo)) return { type: 'undo' }
  if (hasAny(ws, v.score)) return { type: 'score' }
  if (!hasAny(ws, v.point)) return null

  const nameWords = teamNames.map(words) as [string[], string[]]
  const distinct: [string[], string[]] = [
    nameWords[0].filter((w) => !nameWords[1].includes(w)),
    nameWords[1].filter((w) => !nameWords[0].includes(w)),
  ]
  const hits = ([0, 1] as const).filter((t) => mentioned(ws, distinct[t], v.teams[t]))
  if (hits.length !== 1) return null
  return { type: 'point', team: hits[0] }
}
```

Run: `cd web && npm test && npm run typecheck`
Expected: всё проходит.

- [ ] **Step 3: Commit**

```bash
git add web/src/voice
git commit -m "feat(voice): parse point, undo and score commands in en and ru

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Тексты объявления счёта

**Files:**
- Create: `web/src/voice/announce.ts`
- Create: `web/src/voice/announce.test.ts`

**Interfaces:**
- Consumes: `MatchState`, `MatchConfig`, `Pts`.
- Produces:
  ```ts
  function scoreText(state: MatchState, config: MatchConfig): string          // текущий счёт, подающая команда первой
  function afterPointText(prev: MatchState, next: MatchState, team: Team, config: MatchConfig): string
  function decidingLabel(mode: DeuceMode, lang: Lang): string                 // 'Golden point' | 'Deciding point' | 'Star point'
  ```
  Язык берётся из `config.voice.lang`.

- [ ] **Step 1: Тесты**

`web/src/voice/announce.test.ts`:

```ts
import { describe, expect, test } from 'vitest'
import { reduce } from '../domain/reduce'
import { defaultConfig, type DeuceMode, type Lang, type MatchConfig } from '../domain/types'
import { game, pts } from '../domain/testUtils'
import { afterPointText, decidingLabel, scoreText } from './announce'

function cfg(lang: Lang = 'en', deuceMode: DeuceMode = 2): MatchConfig {
  const c = defaultConfig()
  c.voice.lang = lang
  c.deuceMode = deuceMode
  return c
}

function after(seq: string, c = cfg()): string {
  const prev = reduce(c, pts(seq.slice(0, -1)))
  const next = reduce(c, pts(seq))
  const team = seq.at(-1) === 'A' ? 0 : 1
  return afterPointText(prev, next, team, c)
}

describe('scoreText en', () => {
  test('server score first', () => {
    expect(scoreText(reduce(cfg(), []), cfg())).toBe('love all')
    expect(scoreText(reduce(cfg(), pts('A')), cfg())).toBe('fifteen love')
    expect(scoreText(reduce(cfg(), pts('B')), cfg())).toBe('love fifteen')
    // game 2: team 1 serves, so its points come first
    expect(scoreText(reduce(cfg(), pts(game('A') + 'A')), cfg())).toBe('love fifteen')
  })
  test('all, deuce, advantage, deciding', () => {
    expect(scoreText(reduce(cfg(), pts('AB')), cfg())).toBe('fifteen all')
    expect(scoreText(reduce(cfg(), pts('AAABBB')), cfg())).toBe('deuce')
    expect(scoreText(reduce(cfg(), pts('AAABBBA')), cfg())).toBe('advantage Red')
    expect(scoreText(reduce(cfg(), pts('AAABBBAB')), cfg())).toBe('deciding point')
    expect(scoreText(reduce(cfg('en', 1), pts('AAABBB')), cfg('en', 1))).toBe('golden point')
    expect(scoreText(reduce(cfg('en', 3), pts('AAABBBABAB')), cfg('en', 3))).toBe('star point')
  })
  test('tiebreak uses numbers, server first', () => {
    const c = cfg()
    const tb = (game('A') + game('B')).repeat(6)
    // 3 points played: rotation index 12 + 1 + 1 = 14 -> team 0 serves, its points first
    expect(scoreText(reduce(c, pts(tb + 'AAB')), c)).toBe('2 1')
  })
  test('finished match', () => {
    const c = { ...cfg(), format: 'one_set' as const }
    expect(scoreText(reduce(c, pts(game('A').repeat(6))), c)).toBe('game, set and match Red')
  })
})

describe('afterPointText en', () => {
  test('inside a game it is the score', () => {
    expect(after('A')).toBe('fifteen love')
  })
  test('game won announces winner and games, winner first', () => {
    expect(after('AAAA')).toBe('game Red, 1 0')
    expect(after(game('A') + 'BBBB')).toBe('game Blue, 1 1')
  })
  test('set won announces the set', () => {
    expect(after(game('A').repeat(6))).toBe('game and set Red, 6 0')
  })
  test('match won', () => {
    const c = { ...cfg(), format: 'one_set' as const }
    expect(after(game('A').repeat(6), c)).toBe('game, set and match Red')
  })
})

describe('russian', () => {
  test('score words', () => {
    const c = cfg('ru')
    expect(scoreText(reduce(c, pts('A')), c)).toBe('пятнадцать ноль')
    expect(scoreText(reduce(c, pts('AB')), c)).toBe('по пятнадцать')
    expect(scoreText(reduce(c, pts('AAABBB')), c)).toBe('ровно')
    expect(scoreText(reduce(c, pts('AAABBBA')), c)).toBe('больше Red')
    expect(scoreText(reduce(c, pts('AAABBBAB')), c)).toBe('решающее очко')
    expect(after('AAAA', c)).toBe('гейм Red, 1 0')
  })
})

test('decidingLabel', () => {
  expect(decidingLabel(1, 'en')).toBe('Golden point')
  expect(decidingLabel(2, 'en')).toBe('Deciding point')
  expect(decidingLabel(3, 'en')).toBe('Star point')
  expect(decidingLabel('advantage', 'en')).toBe('Deciding point')
  expect(decidingLabel(1, 'ru')).toBe('Золотое очко')
})
```

Run: `cd web && npx vitest run src/voice/announce.test.ts`
Expected: FAIL, модуль `./announce` не найден.

- [ ] **Step 2: Реализация**

`web/src/voice/announce.ts`:

```ts
import { other, type DeuceMode, type Lang, type MatchConfig, type MatchState, type Pts, type Team } from '../domain/types'

interface Texts {
  pts: Record<Exclude<Pts, 'AD'>, string>
  all: (p: string) => string
  deuce: string
  advantage: (name: string) => string
  deciding: Record<DeuceMode, string>
  game: (name: string) => string
  set: (name: string) => string
  match: (name: string) => string
  labels: Record<DeuceMode, string>
}

const T: Record<Lang, Texts> = {
  en: {
    pts: { 0: 'love', 15: 'fifteen', 30: 'thirty', 40: 'forty' },
    all: (p: string) => `${p} all`,
    deuce: 'deuce',
    advantage: (name: string) => `advantage ${name}`,
    deciding: { 1: 'golden point', 2: 'deciding point', 3: 'star point', advantage: 'deciding point' },
    game: (name: string) => `game ${name}`,
    set: (name: string) => `game and set ${name}`,
    match: (name: string) => `game, set and match ${name}`,
    labels: { 1: 'Golden point', 2: 'Deciding point', 3: 'Star point', advantage: 'Deciding point' },
  },
  ru: {
    pts: { 0: 'ноль', 15: 'пятнадцать', 30: 'тридцать', 40: 'сорок' },
    all: (p: string) => `по ${p}`,
    deuce: 'ровно',
    advantage: (name: string) => `больше ${name}`,
    deciding: { 1: 'золотое очко', 2: 'решающее очко', 3: 'стар поинт', advantage: 'решающее очко' },
    game: (name: string) => `гейм ${name}`,
    set: (name: string) => `гейм и сет ${name}`,
    match: (name: string) => `гейм, сет и матч ${name}`,
    labels: { 1: 'Золотое очко', 2: 'Решающее очко', 3: 'Стар поинт', advantage: 'Решающее очко' },
  },
}

export function decidingLabel(mode: DeuceMode, lang: Lang): string {
  return T[lang].labels[mode]
}

export function scoreText(state: MatchState, config: MatchConfig): string {
  const t = T[config.voice.lang]
  const name = (team: Team) => config.teams[team].name
  if (state.finished) return t.match(name(state.finished.winner))

  const sv = state.server.team
  const rc = other(sv)
  if (state.game.kind === 'tiebreak') {
    return `${state.game.points[sv]} ${state.game.points[rc]}`
  }
  if (state.decidingPoint) return t.deciding[config.deuceMode]
  const [a, b] = state.game.points
  if (a === 'AD') return t.advantage(name(0))
  if (b === 'AD') return t.advantage(name(1))
  if (a === 40 && b === 40) return t.deuce
  if (a === b) return t.all(t.pts[a])
  return `${t.pts[state.game.points[sv] as Exclude<Pts, 'AD'>]} ${t.pts[state.game.points[rc] as Exclude<Pts, 'AD'>]}`
}

function totalGames(sets: Array<[number, number]>): number {
  return sets.reduce((n, [a, b]) => n + a + b, 0)
}

export function afterPointText(prev: MatchState, next: MatchState, team: Team, config: MatchConfig): string {
  const t = T[config.voice.lang]
  const name = config.teams[team].name
  if (next.finished) return t.match(name)
  if (totalGames(next.sets) === totalGames(prev.sets)) return scoreText(next, config)

  const setEnded = next.sets.length > prev.sets.length
  const set = setEnded ? next.sets[next.sets.length - 2] : next.sets[next.sets.length - 1]
  const games = `${set[team]} ${set[other(team)]}`
  return `${setEnded ? t.set(name) : t.game(name)}, ${games}`
}
```

Run: `cd web && npm test && npm run typecheck`
Expected: всё проходит.

- [ ] **Step 3: Commit**

```bash
git add web/src/voice
git commit -m "feat(voice): score announcement texts in en and ru

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Обёртки Web Speech API: распознавание и озвучивание

**Files:**
- Create: `web/src/voice/recognizer.ts`
- Create: `web/src/voice/speaker.ts`

**Interfaces:**
- Produces:
  ```ts
  const speechRecognitionSupported: boolean
  class Recognizer {
    constructor(lang: Lang, onTranscript: (text: string) => void, onListening: (listening: boolean) => void)
    start(): void   // слушать, с автоперезапуском
    stop(): void    // выключить совсем
    pause(): void   // временно (на время озвучивания)
    resume(): void
  }
  function speak(text: string, lang: Lang): Promise<void>   // resolve после конца речи или сразу, если TTS нет
  ```
  Юнит-тестов нет: браузерные API. Проверяется typecheck и ручная проверка в Task 11.

- [ ] **Step 1: recognizer.ts**

```ts
import type { Lang } from '../domain/types'

const LOCALE: Record<Lang, string> = { en: 'en-US', ru: 'ru-RU' }

interface RecResult { isFinal: boolean; 0: { transcript: string } }
interface RecEvent { resultIndex: number; results: ArrayLike<RecResult> }
interface RecErrorEvent { error: string }
interface Rec {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  abort(): void
  onresult: ((e: RecEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: RecErrorEvent) => void) | null
}

const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition

export const speechRecognitionSupported = Boolean(Ctor)

export class Recognizer {
  private rec: Rec | null = null
  private active = false
  private paused = false

  constructor(
    private readonly lang: Lang,
    private readonly onTranscript: (text: string) => void,
    private readonly onListening: (listening: boolean) => void,
  ) {}

  start(): void {
    this.active = true
    this.spawn()
  }

  stop(): void {
    this.active = false
    this.kill()
    this.onListening(false)
  }

  pause(): void {
    this.paused = true
    this.kill()
  }

  resume(): void {
    this.paused = false
    this.spawn()
  }

  private kill(): void {
    const r = this.rec
    this.rec = null
    r?.abort()
  }

  private spawn(): void {
    if (!Ctor || this.rec || this.paused || !this.active) return
    const r = new Ctor()
    r.lang = LOCALE[this.lang]
    r.continuous = true
    r.interimResults = false
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) this.onTranscript(res[0].transcript)
      }
    }
    r.onend = () => {
      if (this.rec !== r) return
      this.rec = null
      // Chrome on Android stops after a pause; restart while the user wants to listen
      setTimeout(() => this.spawn(), 300)
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') this.stop()
    }
    this.rec = r
    r.start()
    this.onListening(true)
  }
}
```

- [ ] **Step 2: speaker.ts**

```ts
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
```

Run: `cd web && npm run typecheck`
Expected: ошибок нет.

- [ ] **Step 3: Commit**

```bash
git add web/src/voice
git commit -m "feat(voice): Web Speech API recognizer with auto restart and speaker

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Экран матча: зоны, длинное нажатие, полоса подачи, конец матча

**Files:**
- Create: `web/src/ui/longpress.ts`
- Create: `web/src/ui/match.ts`
- Modify: `web/src/style.css`
- Modify: `web/src/main.ts` (временная демонстрация, заменится в Task 10)

**Interfaces:**
- Consumes: `MatchState`, `MatchConfig`, `reduce`, `decidingLabel`.
- Produces:
  ```ts
  function attachPressHandlers(el: HTMLElement, h: { onTap(): void; onLongPress(): void }, holdMs?: number): void
  interface MatchScreenHandlers { onPoint(team: Team): void; onUndo(): void; onNewMatch(): void; onToggleVoice(): void; onExit(): void }
  interface MatchScreenView { config: MatchConfig; state: MatchState; listening: boolean; voiceAvailable: boolean }
  class MatchScreen {
    constructor(root: HTMLElement, handlers: MatchScreenHandlers)
    render(view: MatchScreenView): void
    toast(text: string): void
  }
  ```

- [ ] **Step 1: longpress.ts**

```ts
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
```

- [ ] **Step 2: match.ts**

```ts
import type { MatchConfig, MatchState, Team } from '../domain/types'
import { decidingLabel } from '../voice/announce'
import { attachPressHandlers } from './longpress'

export interface MatchScreenHandlers {
  onPoint(team: Team): void
  onUndo(): void
  onNewMatch(): void
  onToggleVoice(): void
  onExit(): void
}

export interface MatchScreenView {
  config: MatchConfig
  state: MatchState
  listening: boolean
  voiceAvailable: boolean
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  e.className = className
  if (text) e.textContent = text
  return e
}

interface Zone {
  root: HTMLElement
  pts: HTMLElement
  name: HTMLElement
  games: HTMLElement
  sets: HTMLElement
}

export class MatchScreen {
  private readonly root: HTMLElement
  private readonly zones: [Zone, Zone]
  private readonly serverLine: HTMLElement
  private readonly deciding: HTMLElement
  private readonly toastEl: HTMLElement
  private readonly micBtn: HTMLButtonElement
  private readonly endOverlay: HTMLElement
  private readonly endText: HTMLElement
  private readonly exitOverlay: HTMLElement
  private toastTimer: number | null = null

  constructor(root: HTMLElement, private readonly h: MatchScreenHandlers) {
    this.root = root
    root.innerHTML = ''
    root.className = 'match'

    this.zones = [this.makeZone(0), this.makeZone(1)]

    const bar = el('div', 'bar')
    this.serverLine = el('div', 'server')
    this.deciding = el('div', 'deciding')
    bar.append(this.serverLine, this.deciding)

    this.toastEl = el('div', 'toast')

    const controls = el('div', 'controls')
    this.micBtn = el('button', 'ctl mic')
    this.micBtn.type = 'button'
    this.micBtn.addEventListener('click', () => this.h.onToggleVoice())
    const exitBtn = el('button', 'ctl', '⚙')
    exitBtn.type = 'button'
    exitBtn.addEventListener('click', () => this.exitOverlay.classList.remove('hidden'))
    controls.append(this.micBtn, exitBtn)

    // no window.confirm: native dialogs block browser automation and look off in fullscreen
    this.exitOverlay = el('div', 'end hidden')
    const exitText = el('div', 'end-text', 'Go to settings?\nThe match stays saved.')
    const leaveBtn = el('button', 'big', 'Settings')
    leaveBtn.type = 'button'
    leaveBtn.addEventListener('click', () => this.h.onExit())
    const stayBtn = el('button', 'big secondary', 'Back to match')
    stayBtn.type = 'button'
    stayBtn.addEventListener('click', () => this.exitOverlay.classList.add('hidden'))
    this.exitOverlay.append(exitText, leaveBtn, stayBtn)

    this.endOverlay = el('div', 'end hidden')
    this.endText = el('div', 'end-text')
    const newBtn = el('button', 'big', 'New match')
    newBtn.type = 'button'
    newBtn.addEventListener('click', () => this.h.onNewMatch())
    const undoBtn = el('button', 'big secondary', 'Undo last point')
    undoBtn.type = 'button'
    undoBtn.addEventListener('click', () => this.h.onUndo())
    this.endOverlay.append(this.endText, newBtn, undoBtn)

    root.append(this.zones[0].root, bar, this.zones[1].root, this.toastEl, controls, this.exitOverlay, this.endOverlay)
  }

  private makeZone(team: Team): Zone {
    const root = el('div', `zone team${team}`)
    root.dataset.team = String(team)
    const pts = el('div', 'pts')
    const name = el('div', 'name')
    const meta = el('div', 'meta')
    const games = el('span', 'games')
    const sets = el('span', 'sets')
    meta.append(games, sets)
    root.append(pts, name, meta)
    attachPressHandlers(root, {
      onTap: () => this.h.onPoint(team),
      onLongPress: () => this.h.onUndo(),
    })
    return { root, pts, name, games, sets }
  }

  render(v: MatchScreenView): void {
    const { state, config } = v
    const swapped = config.swapZonesWithSides && state.swapped
    this.root.classList.toggle('swapped', swapped)

    for (const team of [0, 1] as const) {
      const z = this.zones[team]
      const g = state.game
      z.pts.textContent = String(g.points[team])
      z.name.textContent = config.teams[team].name
      const current = state.sets[state.sets.length - 1]
      const finishedSets = state.finished ? state.sets : state.sets.slice(0, -1)
      z.games.textContent = state.finished ? '' : `Games ${current[team]}`
      z.sets.textContent = finishedSets.length ? `Prev sets ${finishedSets.map((s) => s[team]).join(' ')}` : ''
      z.root.classList.toggle('serving', state.server.team === team)
    }

    const sv = state.server
    const serverName = config.teams[sv.team].players[sv.player]
    this.serverLine.textContent = `${serverName}  ${sv.side === 'right' ? 'R' : 'L'}`
    this.serverLine.className = `server team${sv.team}`

    if (state.decidingPoint) {
      this.deciding.textContent = decidingLabel(config.deuceMode, 'en')
      this.deciding.classList.add('on')
    } else if (state.game.kind === 'tiebreak') {
      this.deciding.textContent = state.game.target === 10 ? 'Super tiebreak' : 'Tiebreak'
      this.deciding.classList.add('on')
    } else {
      this.deciding.textContent = ''
      this.deciding.classList.remove('on')
    }

    this.micBtn.hidden = !v.voiceAvailable
    this.micBtn.textContent = v.listening ? '🎤' : '🔇'
    this.micBtn.classList.toggle('on', v.listening)

    if (state.finished) {
      const w = state.finished.winner
      const score = state.sets.map((s) => `${s[w]}-${s[w === 0 ? 1 : 0]}`).join('  ')
      this.endText.textContent = `${config.teams[w].name} wins  ${score}`
      this.endOverlay.classList.remove('hidden')
    } else {
      this.endOverlay.classList.add('hidden')
    }
  }

  toast(text: string): void {
    this.toastEl.textContent = text
    this.toastEl.classList.add('show')
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer)
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 2000)
  }
}
```

- [ ] **Step 3: Стили экрана матча**

Добавить в конец `web/src/style.css`:

```css
/* match screen */
.match {
  position: relative;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2vh;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}
.zone.team0 { background: color-mix(in srgb, var(--team0) 30%, var(--bg)); }
.zone.team1 { background: color-mix(in srgb, var(--team1) 30%, var(--bg)); }
.zone.serving::before {
  content: '';
  position: absolute;
  inset: 0;
  border: 0.6vh solid var(--accent);
  pointer-events: none;
}
.swapped .zone.team0 { order: 3; }
.swapped .zone.team1 { order: 1; }
.swapped .bar { order: 2; }

.zone .pts {
  font-size: min(48vh, 30vw);
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.zone .name { font-size: 5vh; font-weight: 600; }
.zone .meta { font-size: 3.5vh; color: var(--muted); display: flex; gap: 3vw; }

.zone::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.35);
  transform: scaleY(0);
  transform-origin: bottom;
  pointer-events: none;
}
.zone.holding::after {
  animation: fill 600ms linear forwards;
}
@keyframes fill {
  to { transform: scaleY(1); }
}

.bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2vh;
  padding: 0 2vw;
  min-width: 22vw;
  text-align: center;
}
.server { font-size: 4.5vh; font-weight: 700; white-space: pre; }
.server.team0 { color: var(--team0); }
.server.team1 { color: var(--team1); }
.deciding {
  font-size: 3.5vh;
  font-weight: 700;
  color: var(--bg);
  background: var(--accent);
  padding: 1vh 2vw;
  border-radius: 1vh;
  visibility: hidden;
}
.deciding.on { visibility: visible; }

.toast {
  position: absolute;
  left: 50%;
  top: 8vh;
  transform: translateX(-50%);
  background: var(--fg);
  color: var(--bg);
  font-size: 5vh;
  font-weight: 800;
  padding: 1vh 4vw;
  border-radius: 2vh;
  opacity: 0;
  transition: opacity 150ms;
  pointer-events: none;
}
.toast.show { opacity: 1; }

.controls {
  position: absolute;
  right: 1vh;
  bottom: 1vh;
  display: flex;
  gap: 1vh;
}
.ctl {
  font-size: 3.5vh;
  width: 7vh;
  height: 7vh;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.15);
  color: var(--fg);
  opacity: 0.6;
}
.ctl.on { opacity: 1; background: var(--accent); }

.end {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.92);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3vh;
}
.end.hidden { display: none; }
.end-text { font-size: 7vh; font-weight: 800; white-space: pre; text-align: center; }

button.big {
  font-size: 4vh;
  padding: 2vh 6vw;
  border-radius: 2vh;
  border: none;
  background: var(--accent);
  color: var(--bg);
  font-weight: 700;
}
button.big.secondary { background: rgba(255, 255, 255, 0.2); color: var(--fg); }
```

- [ ] **Step 4: Временная демонстрация в main.ts**

`web/src/main.ts` (будет заменён в Task 10):

```ts
import './style.css'
import { reduce } from './domain/reduce'
import { defaultConfig, type MatchEvent } from './domain/types'
import { MatchScreen } from './ui/match'

const root = document.getElementById('app')!
const config = defaultConfig()
let events: MatchEvent[] = []

const screen = new MatchScreen(root, {
  onPoint: (team) => {
    events.push({ type: 'point', team, at: Date.now() })
    screen.toast(`Point ${config.teams[team].name}`)
    draw()
  },
  onUndo: () => {
    events.push({ type: 'undo', at: Date.now() })
    draw()
  },
  onNewMatch: () => {
    events = []
    draw()
  },
  onToggleVoice: () => {},
  onExit: () => {},
})

function draw() {
  screen.render({ config, state: reduce(config, events), listening: false, voiceAvailable: false })
}
draw()
```

- [ ] **Step 5: Проверка в браузере**

Run: `cd web && npm run dev`
Открыть `http://localhost:5173/whatscore/` в Chrome с эмуляцией телефона в горизонтальной ориентации (примерно 850x390). Проверить:

- Две зоны, красная слева, синяя справа, счёт `0` крупно, `Red 1  R` в центре, жёлтая рамка на красной зоне.
- Тап по красной зоне: `15`, всплывает `Point Red`, полоса показывает `Red 1  L`.
- Четыре тапа по красной: гейм, `Games 1`, зоны поменялись местами (синяя слева), подаёт `Blue 1  R`.
- Удержание зоны 600 мс: заливка снизу вверх, потом счёт возвращается.
- Долгое нажатие с пустым журналом ничего не ломает.
- Довести до 6:6 по геймам: центр показывает `Tiebreak`, крупно очки тай-брейка.
- Доиграть матч: оверлей `Red wins  6-0 6-0`, кнопка `New match` обнуляет.
- Контекстное меню при удержании не появляется.

Run: `cd web && npm run typecheck && npm test`
Expected: чисто.

- [ ] **Step 6: Commit**

```bash
git add web/src/ui web/src/style.css web/src/main.ts
git commit -m "feat(ui): match screen with tap zones, long press undo and end overlay

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Экран настройки, контроллер, wake lock и fullscreen

**Files:**
- Create: `web/src/ui/setup.ts`
- Create: `web/src/ui/screen.ts`
- Create: `web/src/app.ts`
- Modify: `web/src/main.ts`
- Modify: `web/src/style.css`

**Interfaces:**
- Consumes: `MatchScreen`, `createStorage`, `reduce`, `defaultConfig`, `mergeConfig`.
- Produces:
  ```ts
  function renderSetup(root: HTMLElement, initial: MatchConfig, onStart: (config: MatchConfig) => void): void
  function keepScreenOn(): void          // wake lock + повтор при возврате на вкладку
  function enterFullscreen(): void       // fullscreen + попытка lock('landscape'), всё в try/catch
  class App { constructor(root: HTMLElement, storage: MatchStorage); boot(): void }
  ```
  Голос в App подключается в Task 11; здесь `onToggleVoice` пустой, `voiceAvailable: false`.

- [ ] **Step 1: setup.ts**

```ts
import { type DeuceMode, type MatchConfig, type MatchFormat, type Team } from '../domain/types'

function field(label: string, input: HTMLElement): HTMLElement {
  const wrap = document.createElement('label')
  wrap.className = 'field'
  const span = document.createElement('span')
  span.textContent = label
  wrap.append(span, input)
  return wrap
}

function text(value: string): HTMLInputElement {
  const i = document.createElement('input')
  i.type = 'text'
  i.value = value
  i.required = true
  i.maxLength = 20
  return i
}

function select<T extends string>(value: T, options: Array<[T, string]>): HTMLSelectElement {
  const s = document.createElement('select')
  for (const [v, label] of options) {
    const o = document.createElement('option')
    o.value = v
    o.textContent = label
    o.selected = v === value
    s.append(o)
  }
  return s
}

function checkbox(checked: boolean): HTMLInputElement {
  const c = document.createElement('input')
  c.type = 'checkbox'
  c.checked = checked
  return c
}

export function renderSetup(root: HTMLElement, initial: MatchConfig, onStart: (config: MatchConfig) => void): void {
  root.innerHTML = ''
  root.className = 'setup'
  const form = document.createElement('form')
  form.className = 'setup-form'

  const teamName = [text(initial.teams[0].name), text(initial.teams[1].name)]
  const players = initial.teams.map((t) => [text(t.players[0]), text(t.players[1])])

  const teamsRow = document.createElement('div')
  teamsRow.className = 'teams'
  for (const t of [0, 1] as const) {
    const col = document.createElement('div')
    col.className = `team-col team${t}`
    col.append(
      field('Team', teamName[t]),
      field('Player 1 (serves first)', players[t][0]),
      field('Player 2', players[t][1]),
    )
    teamsRow.append(col)
  }

  const firstTeam = select(String(initial.firstServingTeam) as '0' | '1', [
    ['0', 'Left team serves first'],
    ['1', 'Right team serves first'],
  ])
  const deuce = select(String(initial.deuceMode) as '1' | '2' | '3' | 'advantage', [
    ['1', 'Golden point (1 deuce)'],
    ['2', 'Advantage once, then golden (2 deuces)'],
    ['3', 'Star point (3 deuces)'],
    ['advantage', 'Classic advantage'],
  ])
  const format = select<MatchFormat>(initial.format, [
    ['one_set', 'One set'],
    ['best_of_3', 'Best of 3 sets'],
    ['best_of_3_super_tb', 'Best of 3, super tiebreak decider'],
  ])
  const swap = checkbox(initial.swapZonesWithSides)
  const voiceEnabled = checkbox(initial.voice.enabled)
  const announce = checkbox(initial.voice.announce)
  const lang = select(initial.voice.lang, [
    ['en', 'English'],
    ['ru', 'Russian'],
  ])

  const options = document.createElement('div')
  options.className = 'options'
  options.append(
    field('First serve', firstTeam),
    field('Deuce', deuce),
    field('Format', format),
    field('Swap sides on screen with court', swap),
    field('Voice commands', voiceEnabled),
    field('Announce score after each point', announce),
    field('Voice language', lang),
  )

  const start = document.createElement('button')
  start.type = 'submit'
  start.className = 'big'
  start.textContent = 'Start'

  form.append(teamsRow, options, start)
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const deuceMode: DeuceMode = deuce.value === 'advantage' ? 'advantage' : (Number(deuce.value) as 1 | 2 | 3)
    onStart({
      teams: [
        { name: teamName[0].value.trim(), players: [players[0][0].value.trim(), players[0][1].value.trim()] },
        { name: teamName[1].value.trim(), players: [players[1][0].value.trim(), players[1][1].value.trim()] },
      ],
      firstServingTeam: Number(firstTeam.value) as Team,
      deuceMode,
      format: format.value as MatchFormat,
      swapZonesWithSides: swap.checked,
      voice: { enabled: voiceEnabled.checked, announce: announce.checked, lang: lang.value as 'en' | 'ru' },
    })
  })
  root.append(form)
}
```

- [ ] **Step 2: screen.ts**

```ts
type WakeLockSentinel = { release(): Promise<void> }
type NavWithWakeLock = Navigator & { wakeLock?: { request(type: 'screen'): Promise<WakeLockSentinel> } }

let sentinel: WakeLockSentinel | null = null
let installed = false

async function requestWakeLock(): Promise<void> {
  try {
    const nav = navigator as NavWithWakeLock
    if (!nav.wakeLock) return
    sentinel = await nav.wakeLock.request('screen')
  } catch {
    sentinel = null
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
```

- [ ] **Step 3: app.ts**

```ts
import { reduce } from './domain/reduce'
import type { MatchConfig, MatchEvent, MatchState, Team } from './domain/types'
import type { MatchStorage } from './storage'
import { MatchScreen } from './ui/match'
import { enterFullscreen, keepScreenOn } from './ui/screen'
import { renderSetup } from './ui/setup'

export class App {
  private config: MatchConfig
  private events: MatchEvent[] = []
  private state: MatchState
  private screen: MatchScreen | null = null

  constructor(
    private readonly root: HTMLElement,
    private readonly storage: MatchStorage,
  ) {
    this.config = storage.loadLastConfig()
    this.state = reduce(this.config, this.events)
  }

  boot(): void {
    const stored = this.storage.loadMatch()
    if (stored) {
      this.config = stored.config
      this.events = stored.events
      this.showMatch()
    } else {
      this.showSetup()
    }
  }

  private showSetup(): void {
    this.screen = null
    renderSetup(this.root, this.config, (config) => this.startMatch(config))
  }

  private startMatch(config: MatchConfig): void {
    this.config = config
    this.events = []
    this.storage.saveLastConfig(config)
    this.storage.saveMatch({ config, events: this.events })
    enterFullscreen()
    this.showMatch()
  }

  private showMatch(): void {
    keepScreenOn()
    this.screen = new MatchScreen(this.root, {
      onPoint: (team) => this.point(team),
      onUndo: () => this.undo(),
      onNewMatch: () => this.newMatch(),
      onToggleVoice: () => {},
      onExit: () => this.showSetup(),
    })
    this.draw()
  }

  private point(team: Team): void {
    if (this.state.finished) return
    this.push({ type: 'point', team, at: Date.now() })
    this.screen?.toast(`Point ${this.config.teams[team].name}`)
  }

  private undo(): void {
    if (!this.state.canUndo) return
    this.push({ type: 'undo', at: Date.now() })
    navigator.vibrate?.(60)
    this.screen?.toast('Undo')
  }

  private push(e: MatchEvent): void {
    this.events.push(e)
    this.storage.saveMatch({ config: this.config, events: this.events })
    this.draw()
  }

  private newMatch(): void {
    this.storage.clearMatch()
    this.events = []
    this.showSetup()
  }

  private draw(): void {
    this.state = reduce(this.config, this.events)
    this.screen?.render({ config: this.config, state: this.state, listening: false, voiceAvailable: false })
  }
}
```

- [ ] **Step 4: main.ts и стили настройки**

`web/src/main.ts`:

```ts
import './style.css'
import { App } from './app'
import { createStorage } from './storage'

const root = document.getElementById('app')!
new App(root, createStorage()).boot()
```

Добавить в `web/src/style.css`:

```css
/* setup screen */
.setup {
  overflow-y: auto;
  padding: 16px;
}
.setup-form {
  max-width: 900px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.teams { display: flex; gap: 16px; }
.team-col { flex: 1; padding: 12px; border-radius: 12px; display: flex; flex-direction: column; gap: 8px; }
.team-col.team0 { background: color-mix(in srgb, var(--team0) 30%, var(--bg)); }
.team-col.team1 { background: color-mix(in srgb, var(--team1) 30%, var(--bg)); }
.options { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
.field { display: flex; flex-direction: column; gap: 4px; font-size: 14px; color: var(--muted); }
.field input[type='text'], .field select {
  font-size: 18px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #334155;
  background: #1e293b;
  color: var(--fg);
}
.field input[type='checkbox'] { width: 24px; height: 24px; }
.setup button.big { align-self: center; }
@media (max-width: 600px) {
  .teams { flex-direction: column; }
  .options { grid-template-columns: 1fr; }
}
```

- [ ] **Step 5: Проверка в браузере**

Run: `cd web && npm run typecheck && npm test && npm run dev`
В Chrome с эмуляцией телефона в горизонтальной ориентации проверить:

- Открывается экран настройки с дефолтами `Red`/`Blue`, кнопка `Start`.
- Изменить имя команды на `Ilya & Andreas`, Start: экран матча, имя видно.
- Набрать несколько очков, перезагрузить страницу: тот же счёт, тот же экран (матч восстановлен).
- Кнопка ⚙, оверлей «Go to settings?», кнопка Settings: экран настройки с последними именами; при повторной перезагрузке снова открывается матч, потому что он не завершён.
- Доиграть матч, `New match`: настройки с последними именами; перезагрузка открывает настройки, не матч.
- В DevTools Application → Local Storage видны ключи `whatscore.match` и `whatscore.lastConfig`.

- [ ] **Step 6: Commit**

```bash
git add web/src
git commit -m "feat: setup screen, app controller, persistence, wake lock and fullscreen

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Голос в приложении: команды, озвучивание, кнопка микрофона

**Files:**
- Modify: `web/src/app.ts`

**Interfaces:**
- Consumes: `Recognizer`, `speechRecognitionSupported`, `speak`, `parseCommand`, `scoreText`, `afterPointText`.

- [ ] **Step 1: Подключить голос в App**

В `web/src/app.ts` добавить импорты:

```ts
import { afterPointText, scoreText } from './voice/announce'
import { parseCommand } from './voice/commands'
import { Recognizer, speechRecognitionSupported } from './voice/recognizer'
import { speak } from './voice/speaker'
```

Добавить поля класса:

```ts
  private recognizer: Recognizer | null = null
  private listening = false
```

В `showMatch()` заменить `onToggleVoice: () => {}` на `onToggleVoice: () => this.toggleVoice()`, и после `this.draw()` добавить:

```ts
    if (this.config.voice.enabled) this.startVoice()
```

В `showSetup()` и `newMatch()` первой строкой добавить `this.stopVoice()`.

Добавить методы:

```ts
  private startVoice(): void {
    if (!speechRecognitionSupported || this.recognizer) return
    this.recognizer = new Recognizer(
      this.config.voice.lang,
      (text) => this.onTranscript(text),
      (listening) => {
        this.listening = listening
        this.draw()
      },
    )
    this.recognizer.start()
  }

  private stopVoice(): void {
    this.recognizer?.stop()
    this.recognizer = null
    this.listening = false
  }

  private toggleVoice(): void {
    if (this.recognizer) this.stopVoice()
    else this.startVoice()
    this.draw()
  }

  private onTranscript(text: string): void {
    const cmd = parseCommand(text, [this.config.teams[0].name, this.config.teams[1].name], this.config.voice.lang)
    if (!cmd) return
    if (cmd.type === 'point') this.point(cmd.team)
    else if (cmd.type === 'undo') this.undo()
    else void this.say(scoreText(this.state, this.config))
  }

  private async say(text: string): Promise<void> {
    this.recognizer?.pause()
    await speak(text, this.config.voice.lang)
    this.recognizer?.resume()
  }
```

Изменить `point()` так, чтобы объявлять счёт при `announce`:

```ts
  private point(team: Team): void {
    if (this.state.finished) return
    const prev = this.state
    this.push({ type: 'point', team, at: Date.now() })
    this.screen?.toast(`Point ${this.config.teams[team].name}`)
    if (this.config.voice.announce) void this.say(afterPointText(prev, this.state, team, this.config))
  }
```

В `draw()` передавать реальные значения:

```ts
    this.screen?.render({
      config: this.config,
      state: this.state,
      listening: this.listening,
      voiceAvailable: speechRecognitionSupported,
    })
```

Run: `cd web && npm run typecheck && npm test`
Expected: чисто.

- [ ] **Step 2: Проверка в браузере**

В Chrome на десктопе (распознавание в Chrome desktop тоже работает, нужен микрофон и разрешение):

- В настройках включить `Voice commands` и `Announce score`, Start. Кнопка микрофона в углу показывает 🎤 и жёлтая.
- Сказать «point red»: очко красным, тост `Point Red`, голос произносит `fifteen love`.
- Сказать «what's the score»: произносится текущий счёт.
- Сказать «undo»: очко снято.
- Нажать кнопку микрофона: 🔇, речь игнорируется. Нажать ещё раз: снова слушает.
- Подождать 10 секунд молча: индикатор остаётся 🎤 (перезапуск после `end` работает); в консоли нет исключений.
- Выключить `Voice commands` в настройках: кнопки микрофона нет вовсе, если API нет, или она показывает 🔇.

Если разрешение на микрофон не дано, `onerror` с `not-allowed` останавливает распознавание, кнопка показывает 🔇, приложение не падает.

- [ ] **Step 3: Commit**

```bash
git add web/src/app.ts
git commit -m "feat: voice commands and score announcements in the match screen

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: PWA: манифест, иконки, service worker, деплой на GitHub Pages

**Files:**
- Modify: `web/vite.config.ts`
- Create: `web/scripts/make-icons.mjs`
- Create: `web/public/icon-192.png`, `web/public/icon-512.png` (генерируются скриптом)
- Create: `.github/workflows/deploy.yml`
- Modify: `web/README.md`, `README.md`

- [ ] **Step 1: Скрипт иконок без зависимостей**

`web/scripts/make-icons.mjs` рисует зелёный квадрат с жёлтым кругом (мяч) и пишет PNG через zlib:

```js
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

function crc32(buf) {
  let c, crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function png(size) {
  const bg = [0x0f, 0x17, 0x2a]
  const ball = [0xfa, 0xcc, 0x15]
  const rows = []
  const r = size * 0.36
  const cx = size / 2
  const cy = size / 2
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    row[0] = 0
    for (let x = 0; x < size; x++) {
      const inside = (x - cx) ** 2 + (y - cy) ** 2 <= r * r
      const [rr, gg, bb] = inside ? ball : bg
      row[1 + x * 3] = rr
      row[2 + x * 3] = gg
      row[3 + x * 3] = bb
    }
    rows.push(row)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) writeFileSync(new URL(`../public/icon-${size}.png`, import.meta.url), png(size))
console.log('icons written')
```

Run: `cd web && mkdir -p public && node scripts/make-icons.mjs`
Expected: `icons written`, файлы `public/icon-192.png` и `public/icon-512.png` открываются как изображения (проверить `file public/icon-512.png`: `PNG image data, 512 x 512`).

- [ ] **Step 2: vite.config.ts с PWA**

```ts
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/whatscore/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'WhatScore',
        short_name: 'WhatScore',
        description: 'Padel score keeper',
        start_url: '/whatscore/',
        scope: '/whatscore/',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png}'],
      },
    }),
  ],
})
```

Run: `cd web && npm run build`
Expected: в `dist/` есть `manifest.webmanifest`, `sw.js`, `registerSW.js`, ссылка на манифест в `dist/index.html`.

Run: `cd web && npm run preview` и открыть `http://localhost:4173/whatscore/`: в DevTools Application → Manifest показывает WhatScore с иконками и `orientation: landscape`; Service Workers показывает активный worker. Включить Offline в DevTools и перезагрузить: страница открывается.

- [ ] **Step 3: GitHub Actions**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy web to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: web/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: README про деплой**

Добавить в `web/README.md` раздел:

```markdown
## Деплой

Push в `main` собирает `web/` и публикует на GitHub Pages
(`.github/workflows/deploy.yml`). Один раз в настройках репозитория
GitHub: Settings → Pages → Source: GitHub Actions. Репозиторий должен
называться `whatscore`, потому что base path `/whatscore/`.

Адрес: `https://<user>.github.io/whatscore/`. На телефоне в Chrome:
меню → Add to Home screen. Установленное приложение открывается на весь
экран в горизонтальной ориентации и работает без интернета. Голосовые
команды требуют интернет.

Иконки генерируются `node scripts/make-icons.mjs`.
```

В корневом `README.md` в разделе «Запуск» добавить строку: «Опубликованная версия: `https://<user>.github.io/whatscore/`».

- [ ] **Step 5: Commit**

```bash
git add web/vite.config.ts web/scripts web/public .github web/README.md README.md
git commit -m "feat: PWA manifest, offline cache, icons and GitHub Pages deploy

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Финальная проверка в эмуляции и передача

**Files:** нет новых.

- [ ] **Step 1: Полный прогон**

Run: `cd web && npm run typecheck && npm test && npm run build`
Expected: чисто.

- [ ] **Step 2: Сценарий матча в эмуляции телефона (landscape, ~850x390)**

Через `npm run preview` на собранной версии:

1. Настройка: имена, `Golden point`, `One set`, Start.
2. Сыграть гейм до 40:40: центр показывает `Golden point` жёлтым, следующий тап завершает гейм.
3. Проверить, что после нечётного гейма зоны поменялись местами, а полоса подачи показывает нового подающего и `R`.
4. Снять галку `Swap sides on screen with court` (через ⚙ → это новый матч, поэтому просто начать новый), убедиться, что зоны на месте.
5. Довести до тай-брейка, проверить смену подающего после 1-го очка и потом каждые два.
6. Перезагрузить в середине тай-брейка: состояние восстановилось.
7. Доиграть, оверлей результата, `Undo last point` возвращает в матч, `New match` ведёт на настройки.
8. Портретная ориентация в эмуляции: раскладка та же, счёт читается, ничего не обрезано.

- [ ] **Step 3: Отчёт Илье**

Написать, что проверено в эмуляции и что осталось проверить на реальном телефоне на корте: голос в шуме, автоперезапуск слушания на Android, Wake Lock, fullscreen и фиксация ориентации, читаемость на солнце, вибрация при отмене. Напомнить включить GitHub Pages: Settings → Pages → Source: GitHub Actions.

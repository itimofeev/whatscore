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

export function renderSetup(
  root: HTMLElement,
  initial: MatchConfig,
  onStart: (config: MatchConfig) => void,
  onResume?: () => void,
): void {
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

  const actions = document.createElement('div')
  actions.className = 'actions'
  if (onResume) {
    const back = document.createElement('button')
    back.type = 'button'
    back.className = 'big secondary'
    back.textContent = 'Back to match'
    back.addEventListener('click', onResume)
    actions.append(back)
  }
  actions.append(start)

  form.append(teamsRow, options, actions)
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

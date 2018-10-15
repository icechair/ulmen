import { Effect, Dispatch, Program, StateEffect, View, Update } from './runtime'

export const mapEffect = <A, B>(
  effect: Effect,
  callback: (message: A) => B
): Effect => {
  if (typeof callback !== 'function') {
    throw new Error('callback must be a function')
  }
  if (!effect) {
    return effect
  }
  if (typeof effect !== 'function') {
    throw new Error('Effects must be functions or falsy')
  }
  return (dispatch: Dispatch) => {
    return effect(message => dispatch(callback(message)))
  }
}

export const batchEffects = (effects: Effect[]) => {
  for (const eff of effects) {
    if (eff && typeof eff !== 'function') {
      throw new Error('Effects must be functions or falsy')
    }
  }

  return (dispatch: Dispatch) =>
    effects.map(effect => (effect ? effect(dispatch) : effect))
}

export const mapProgram = <TState, A, B, TView = void>(
  program: Program<TState, TView>,
  callback: (message: A) => B
) => {
  const start = program.init
  const { done } = program
  const init = [start[0], mapEffect(start[1], callback)] as StateEffect<TState>
  const update: Update<TState> = (msg, state: TState) => {
    const change = program.update(msg, state)
    return [change[0], mapEffect(change[1], callback)]
  }

  const view = (state: TState, dispatch: Dispatch) =>
    program.view(state, message => dispatch(callback(message)))

  return { init, update, view, done }
}

export const batchPrograms = <TState = any, TView = void>(
  programs: Array<Program<TState>>,
  containerView: (views: Array<View<TState>>) => TView
): Program<TState[]> => {
  const embeds = [] as Array<typeof programs[0]>
  const states = [] as TState[]
  const effects = []
  const programCount = programs.length
  for (let i = 0; i < programCount; i++) {
    const index = i
    const program = programs[index]
    const embed = mapProgram(program, data => ({ index, data }))
    embeds.push(embed)
    states.push(embed.init[0])
    effects.push(embed.init[1])
  }
  console.log(embeds)
  console.log(states)
  console.log(effects)
  const init = [states, batchEffects(effects)] as StateEffect<TState[]>
  console.log(init)
  const update = <T>(msg: { index: number; data: T }, state: TState[]) => {
    const { index, data } = msg
    const change = embeds[index].update(data, state[index])
    const newState = state.slice(0)
    newState[index] = change[0]
    return [newState, change[1]] as StateEffect<TState[]>
  }

  const view = (state: TState[], dispatch: Dispatch) => {
    const programViews = embeds.map((embed, index) => () =>
      embed.view(state[index], dispatch)
    )
    return containerView(programViews)
  }

  const done = (state: TState[]) => {
    for (let i = 0; i < programCount; i++) {
      const d = embeds[i].done
      console.log('done', state[i], d)
      if (d) {
        d(state[i])
      }
    }
  }
  return { init, update, view, done }
}

export interface AssembleProgram<
  TState,
  TData,
  TDataOpts,
  TLogicOpts,
  TViewOpts,
  TView = void
> {
  data: (opts?: TDataOpts) => TData
  dataOptions?: TDataOpts
  logic: (data: TData, opts?: TLogicOpts) => Program<TState>
  logicOptions?: TLogicOpts
  view: (model: TState, dispatch: Dispatch, opts?: TViewOpts) => TView
  viewOptions?: TViewOpts
}

export const assembleProgram = <
  TState,
  TData,
  TDataOpts,
  TLogicOpts,
  TViewOpts,
  TView = void
>({
  data,
  dataOptions,
  logic,
  logicOptions,
  view,
  viewOptions
}: AssembleProgram<
  TState,
  TData,
  TDataOpts,
  TLogicOpts,
  TViewOpts,
  TView
>): Program<TState, TView> => {
  return Object.assign(
    {
      view: (model: TState, dispatch: Dispatch) => {
        return view(model, dispatch, viewOptions)
      }
    },
    logic(data(dataOptions), logicOptions)
  )
}

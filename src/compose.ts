import { Effect, Dispatch, Program, StateEffect, View, Update } from './runtime'

export const mapEffect = <A, B>(
  effect: Effect<A> | undefined,
  callback: (message: A) => B
): Effect<B> | undefined => {
  if (typeof callback !== 'function') {
    throw new Error('callback must be a function')
  }
  if (!effect) {
    return effect
  }
  if (typeof effect !== 'function') {
    throw new Error('Effects must be functions or falsy')
  }
  return (dispatch: Dispatch<B>) => {
    return effect(message => dispatch(callback(message)))
  }
}

export const batchEffects = <T>(effects: Array<Effect<T> | undefined>) => {
  for (const eff of effects) {
    if (eff && typeof eff !== 'function') {
      throw new Error('Effects must be functions or falsy')
    }
  }

  return (dispatch: Dispatch<T>) =>
    effects.map(effect => (effect ? effect(dispatch) : effect))
}

export const mapProgram = <TState, A, B, TView = void>(
  program: Program<TState, A, TView>,
  callback: (message: A) => B
): Program<TState, B, TView> => {
  const [model, effect] = program.init
  const { done } = program
  const init = [model, mapEffect(effect, callback)] as StateEffect<TState, B>
  const update = (msg: B, state: TState): StateEffect<TState, B> => {
    const [change, changeEffect] = program.update((msg as unknown) as A, state)
    return [change, mapEffect(changeEffect, callback)]
  }

  const view = (state: TState, dispatch: Dispatch<B>) =>
    program.view(state, message => dispatch(callback(message)))

  return { init, update, view, done }
}

export const batchPrograms = <TState, TMessage, TView>(
  programs: Array<Program<TState, TMessage, TView>>,
  containerView: (views: Array<(() => TView)>) => TView
): Program<TState[], { index: number; data: TMessage }, TView> => {
  const embeds = [] as Array<Program<TState, any, TView>>
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
  const init = [states, batchEffects(effects)] as StateEffect<
    TState[],
    { index: number; data: TMessage }
  >
  const update: Update<TState[], { index: number; data: TMessage }> = (
    msg,
    state: TState[]
  ) => {
    const { index, data } = msg
    if (!embeds[index]) {
      return [state]
    }
    const change = embeds[index].update(data, state[index])
    const newState = state.slice(0)
    newState[index] = change[0]
    return [newState, change[1]] as StateEffect<
      TState[],
      { index: number; data: TMessage }
    >
  }

  const view = (
    state: TState[],
    dispatch: Dispatch<{ index: number; data: TMessage }>
  ) => {
    const programViews = embeds.map((embed, index) => () =>
      embed.view(state[index], dispatch)
    )
    return containerView(programViews)
  }

  const done = (state: TState[]) => {
    for (let i = 0; i < programCount; i++) {
      const d = embeds[i].done
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
  TMessage,
  TView = void
> {
  data: (opts: TDataOpts) => TData
  dataOptions: TDataOpts
  logic: (
    data: TData,
    opts?: TLogicOpts
  ) => { init: StateEffect<TState, TMessage>; update: Update<TState, TMessage> }
  logicOptions?: TLogicOpts
  view: (model: TState, dispatch: Dispatch<TMessage>, opts?: TViewOpts) => TView
  viewOptions?: TViewOpts
}

export const assembleProgram = <
  TState,
  TData,
  TDataOpts,
  TLogicOpts,
  TViewOpts,
  TMessage,
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
  TMessage,
  TView
>): Program<TState, TMessage, TView> => {
  return Object.assign(
    {
      view: (model: TState, dispatch: Dispatch<TMessage>) => {
        return view(model, dispatch, viewOptions)
      }
    },
    logic(data(dataOptions), logicOptions)
  )
}

import { Effect, Signal, Ulm, StateEffect, View, Update } from './ulm'

export function mapEffect<A, B>(
  effect: Effect<A> | undefined,
  callback: (message: A) => B
): Effect<B> | undefined {
  if (typeof callback !== 'function') {
    throw new Error('callback must be a function')
  }
  if (!effect) {
    return effect
  }
  if (typeof effect !== 'function') {
    throw new Error('Effects must be functions or falsy')
  }
  return (dispatch: Signal<B>) => {
    return effect(message => dispatch(callback(message)))
  }
}

export const batchEffects = <T>(effects: Array<Effect<T> | undefined>) => {
  for (const eff of effects) {
    if (eff && typeof eff !== 'function') {
      throw new Error('Effects must be functions or falsy')
    }
  }

  return (dispatch: Signal<T>) =>
    effects.map(effect => (effect ? effect(dispatch) : effect))
}

export function mapProgram<TState, A, B, TView = void>(
  program: Ulm<TState, A, TView>,
  callback: (message: A) => B
) {
  const { model, effect } = program.init
  const { done } = program
  const init = { model, effect: mapEffect(effect, callback) }
  const update = (msg: A, state: TState): StateEffect<TState, B> => {
    const change = program.update(msg, state)
    return { ...change, effect: mapEffect(change.effect, callback) }
  }

  const view = (state: TState, dispatch: Signal<B>) =>
    program.view(state, message => dispatch(callback(message)))

  return { init, update, view, done }
}

interface BatchMessage<T> {
  index: number
  data: T
}
export function batchPrograms<TState, TMessage, TView>(
  programs: Array<Ulm<TState, TMessage, TView>>,
  containerView: (views: Array<(() => TView)>) => TView
): Ulm<TState[], BatchMessage<TMessage>, TView> {
  const toBatchMessage = (index: number) => (
    data: TMessage
  ): BatchMessage<TMessage> => ({ index, data })
  const embeds = programs.map((program, index) =>
    mapProgram(program, toBatchMessage(index))
  )
  const states = embeds.map(embed => embed.init.model)
  const effects = embeds.map(embed => embed.init.effect)

  const init = { model: states, effect: batchEffects(effects) }
  const update = (msg: BatchMessage<TMessage>, state: TState[]) => {
    const { index, data } = msg
    if (!embeds[index]) {
      return { model: state }
    }
    const change = embeds[index].update(data, state[index])
    const newState = state.slice(0)
    newState[index] = change.model
    return { model: newState, effect: change.effect }
  }

  const view = (state: TState[], dispatch: Signal<BatchMessage<TMessage>>) => {
    const programViews = embeds.map((embed, index) => () =>
      embed.view(state[index], dispatch)
    )
    return containerView(programViews)
  }

  const done = (state: TState[]) => {
    embeds.forEach(
      (program, index) => (program.done ? program.done(state[index]) : null)
    )
  }
  return { init, update, view, done }
}

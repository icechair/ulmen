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

  return (signal: Signal<T>) =>
    effects.map(effect => (effect ? effect(signal) : effect))
}

export function mapUlm<TState, A, B, TView = void>(
  ulm: Ulm<TState, A, TView>,
  callback: (message: A) => B
) {
  const { model, effect } = ulm.init
  const { done } = ulm
  const init = { model, effect: mapEffect(effect, callback) }
  const update = (msg: A, state: TState): StateEffect<TState, B> => {
    const change = ulm.update(msg, state)
    return { ...change, effect: mapEffect(change.effect, callback) }
  }

  const view = (state: TState, signal: Signal<B>) =>
    ulm.view(state, message => signal(callback(message)))

  return { init, update, view, done }
}

interface BatchMessage<T> {
  index: number
  data: T
}
export function batchUlmen<TState, TMessage, TView>(
  ulmen: Array<Ulm<TState, TMessage, TView>>,
  containerView: (views: Array<(() => TView)>) => TView
): Ulm<TState[], BatchMessage<TMessage>, TView> {
  const toBatchMessage = (index: number) => (
    data: TMessage
  ): BatchMessage<TMessage> => ({ index, data })
  const children = ulmen.map((ulm, index) => mapUlm(ulm, toBatchMessage(index)))
  const states = children.map(embed => embed.init.model)
  const effects = children.map(embed => embed.init.effect)

  const init = { model: states, effect: batchEffects(effects) }
  function update(msg: BatchMessage<TMessage>, state: TState[]) {
    const { index, data } = msg
    if (!children[index]) {
      return { model: state }
    }
    const change = children[index].update(data, state[index])
    const newState = state.slice(0)
    newState[index] = change.model
    return { model: newState, effect: change.effect }
  }

  function view(state: TState[], dispatch: Signal<BatchMessage<TMessage>>) {
    const ulmViews = children.map((child, index) => () =>
      child.view(state[index], dispatch)
    )
    return containerView(ulmViews)
  }

  const done = (state: TState[]) => {
    children.forEach((ulm, index) => (ulm.done ? ulm.done(state[index]) : null))
  }
  return { init, update, view, done }
}

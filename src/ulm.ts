export type Signal<T> = (message: T) => void
export type Effect<T> = ((dispatch: Signal<T>) => void)
export interface StateEffect<TModel, TMessage> {
  model: TModel
  effect?: Effect<TMessage>
}

export type Update<TModel, TMessage> = (
  message: TMessage,
  model: TModel
) => StateEffect<TModel, TMessage>

export type View<TModel, TMessage, TView = void> = (
  model: TModel,
  signal: Signal<TMessage>
) => TView

export type Done<TState> = (state: TState) => void
export interface Ulm<TState, TMessage, TView = void> {
  init: StateEffect<TState, TMessage>
  update: Update<TState, TMessage>
  view: View<TState, TMessage, TView>
  done?: Done<TState>
}

export function ulmen<TModel, TMessage, TView = void>(
  ulm: Ulm<TModel, TMessage, TView>
) {
  let running = true
  const { init, update, view, done } = ulm
  let state: TModel
  function signal(message: TMessage) {
    if (running) {
      change(update(message, state))
    }
  }

  function change(next: StateEffect<TModel, TMessage>) {
    const { model, effect } = next
    state = model
    if (effect) {
      effect(signal)
    }
    view(state, signal)
  }
  function stop() {
    if (running) {
      running = false
      if (done) {
        done(state)
      }
    }
  }

  return {
    start: () => change(init),
    signal,
    stop
  }
}

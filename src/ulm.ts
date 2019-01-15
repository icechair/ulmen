export type Signal<T> = (message: T) => void
export type Effect<T> = ((dispatch: Signal<T>) => void)
export interface INext<TState, TMessage> {
  state: TState
  effect?: Effect<TMessage>
}

export type Update<TState, TMessage> = (
  message: TMessage,
  state: TState
) => INext<TState, TMessage>

export type View<TState, TMessage, TView = void> = (
  state: TState,
  signal: Signal<TMessage>
) => TView

export type Done<TState> = (state: TState) => void
export interface Ulm<TState, TMessage, TView = void> {
  init: INext<TState, TMessage>
  update: Update<TState, TMessage>
  view: View<TState, TMessage, TView>
  done?: Done<TState>
}

export function ulmen<TModel, TMessage, TView = void>(
  ulm: Ulm<TModel, TMessage, TView>
) {
  let running = true
  const { init, update, view, done } = ulm
  let currentState: TModel
  function signal(message: TMessage) {
    if (running) {
      change(update(message, currentState))
    }
  }

  function change(next: INext<TModel, TMessage>) {
    const { state, effect } = next
    currentState = state
    if (effect) {
      effect(signal)
    }
    view(currentState, signal)
  }
  function stop() {
    if (running) {
      running = false
      if (done) {
        done(currentState)
      }
    }
  }

  return {
    start: () => change(init),
    signal,
    stop
  }
}

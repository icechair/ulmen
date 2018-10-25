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

export const ulm = <TModel, TMessage, TView = void>(
  program: Ulm<TModel, TMessage, TView>
) => {
  let running = true
  const { init, update, view, done } = program
  let state: TModel
  const signal: Signal<TMessage> = message => {
    if (running) {
      change(update(message, state))
    }
  }

  const change = (next: StateEffect<TModel, TMessage>) => {
    const { model, effect } = next
    state = model
    if (effect) {
      effect(signal)
    }
    view(state, signal)
  }
  const stop = () => {
    if (running) {
      running = false
    }
    if (done) {
      done(state)
    }
  }

  change(init)
  return {
    signal,
    stop
  }
}

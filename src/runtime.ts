export type Dispatch<T> = (message: T) => void
export type Effect<T> = ((signal: Dispatch<T>) => void)
export type StateEffect<TState, TMessage> = [TState, Effect<TMessage>?]

export type Update<TState, TMessage> = (
  message: TMessage,
  model: TState
) => StateEffect<TState, TMessage>

export type View<TModel, TView = void> = (
  model: TModel,
  dispatch: Dispatch<any>
) => TView

export type Done<TState> = (state: TState) => void
export interface Program<TState, TMessage, TView = void> {
  init: StateEffect<TState, TMessage>
  update: Update<TState, TMessage>
  view: View<TState, TView>
  done?: Done<TState>
}

export const runtime = <TState, TMessage, TView = void>(
  program: Program<TState, TMessage, TView>
) => {
  let isRunning = true
  const { init, update, view, done } = program
  let state: TState
  const dispatch: Dispatch<TMessage> = message => {
    if (isRunning) {
      change(update(message, state))
    }
  }

  const change = (next: StateEffect<TState, TMessage>) => {
    state = next[0]
    const effect = next[1]
    if (effect) {
      effect(dispatch)
    }
    view(state, dispatch)
  }
  change(init)
  return () => {
    if (isRunning) {
      isRunning = false
      if (done) {
        done(state)
      }
    }
  }
}

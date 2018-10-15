export type Dispatch<T = any> = (message: T) => void
export type Effect = ((signal: Dispatch) => void) | undefined
export type StateEffect<TState> = [TState, Effect?]

export type Update<TState, TMessage = any> = (
  message: TMessage,
  model: TState
) => StateEffect<TState>

export type View<TModel, TView = void> = (
  model: TModel,
  dispatch: Dispatch<any>
) => TView

export type Done<TState> = (state: TState) => void
export interface Program<TState, TView = void> {
  init: StateEffect<TState>
  update: Update<TState>
  view: View<TState, TView>
  done?: Done<TState>
}

export const runtime = <TState, TView = void>(
  program: Program<TState, TView>
) => {
  let isRunning = true
  const { init, update, view, done } = program
  let state: TState
  const dispatch = <T>(message: T) => {
    if (isRunning) {
      change(update(message, state))
    }
  }

  const change = (next: StateEffect<TState>) => {
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

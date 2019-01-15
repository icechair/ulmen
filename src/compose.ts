import { Effect, Signal, Ulm, INext } from './ulm'

export function mapEffect<A, B>(
  effect: Effect<A> | undefined,
  callback: (message: A) => B
): Effect<B> | undefined {
  if (!effect) {
    return effect
  }
  return (signal: Signal<B>) => {
    return effect(message => signal(callback(message)))
  }
}

export const batchEffects = <T>(effects: Array<Effect<T> | undefined>) => {
  return (signal: Signal<T>) =>
    effects.map(effect => (effect ? effect(signal) : effect))
}

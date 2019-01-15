import tape from 'tape'
import { mapEffect, batchEffects } from './compose'
import { Signal, Effect } from './ulm'
tape('compose `mapEffect`', t => {
  t.plan(3)
  const a = (signal: Signal<number>) => signal(1)
  const b = mapEffect(a, (message: number) => `make a string from "${message}"`)
  const signalA = msg => t.equal(msg, 1)
  const signalB = msg => t.equal(msg, `make a string from "1"`)

  a(signalA)
  if (!b) {
    t.fail('map failed')
    return
  }
  b(signalB)
  const c = mapEffect(undefined, x => x)
  t.ok(typeof c === 'undefined')
})

tape('compose `batchEffects`', t => {
  const effects = [
    signal => signal(1),
    signal => signal(2),
    undefined,
    signal => signal(3)
  ] as Array<Effect<number>>
  let n = 0
  const mySignal = (msg: number) => (n += msg)

  const batched = batchEffects(effects)
  batched(mySignal)
  t.equal(n, 6, 'batch works')

  t.end()
})

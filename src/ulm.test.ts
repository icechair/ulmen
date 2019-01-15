import tape from 'tape'
import { ulmen, Signal } from './ulm'
tape('ulm', t => {
  t.plan(3)
  let n = 0
  const program = ulmen({
    init: { state: 1 },
    update: (msg: number, state) => (msg ? { state: msg } : { state }),
    view: (state, signal) => {
      if (n === 0) {
        t.equal(state, 1, '`view` gets called initially')
        n++
        signal(2)
      } else if (n === 1) {
        t.equal(state, 2, '`update` got called')
        n++
      } else {
        t.fail('program should have been stopped')
      }
    },
    done: state => t.ok('done got called')
  })
  program.start()
  program.stop()
  program.signal(4)
})

tape('ulm with effect', t => {
  t.plan(2)
  const effect = (signal: Signal<number>) => {
    signal(4)
  }
  let n = 0
  const program = ulmen({
    init: {
      state: 1,
      effect
    },
    update: (msg: number, state) => (msg ? { state: msg } : { state }),
    view: (state, signal) => {
      t.equal(state, 4, 'initial effect')
    },
    done: state => {
      if (n > 1) {
        t.fail('done got called twice')
      }
      ++n
    }
  })

  program.start()
  program.stop()
  program.stop()
})

import test from 'tape'
import { ulmen, Signal, Effect } from './ulm'
import { stringify } from 'querystring'
test('`ulm` should call `view` initially', t => {
  const model = 1
  ulmen({
    init: { model },
    update: (_, state) => ({ model: state }),
    view: _ => {
      t.pass('`view` was called')
      t.end()
    }
  }).start()
})

test('`ulm` should call `view` after signal', async t => {
  let count = 0
  await new Promise(resolve => {
    ulmen({
      init: { model: 'init' },
      update: (msg: string, _state) => ({ model: msg }),
      view: (state, signal) => {
        count++
        if (state === 'init') {
          return signal('next')
        }
        if (state === 'next') {
          return signal('done')
        }
        if (state === 'done') {
          return resolve()
        }
      }
    }).start()
  })
  t.equal(count, 3, '`view` should be called 3 times')
  t.end()
})

test('`ulm().stop` should call `done` when killed', async t => {
  await new Promise(resolve => {
    const model = 'state'
    const runtime = ulmen({
      init: { model },
      update: (_msg, state) => ({ model: state }),
      view: () => undefined,
      done: state => {
        t.equal(state, model, 'the state is passed')
        resolve()
      }
    })
    runtime.start()
    runtime.stop()
  })
  t.end()
})

test('`ulm().stop` should not call `update` and/or `view` if killed', async t => {
  let initialRender = true
  const model = 'state'
  await new Promise(resolve => {
    const afterKillEffect: Effect<string> = dispatch => {
      t.equal(typeof dispatch, 'function', 'dispatch is passed')
      setTimeout(() => {
        dispatch('')
        resolve()
      }, 10)
    }
    const runtime = ulmen({
      init: { model, effect: afterKillEffect },
      update: (_msg, state) => {
        t.fail('`update` should not be called')
        return { model: state }
      },
      view: () => {
        if (initialRender) {
          initialRender = false
          t.pass('`view` is called once')
          return
        }
        t.fail('`view` should not be called more than once')
      }
    })
    runtime.start()
    runtime.stop()
  })
  t.end()
})

test('`ulm().stop()` should call `done` only once', t => {
  let initialCall = true
  const runtime = ulmen({
    init: { model: '' },
    update: (_msg, state) => ({ model: state }),
    view: () => ({}),
    done: () => {
      if (initialCall) {
        initialCall = false
        t.pass('done() was called once')
        return
      }
      t.fail('done() should not be called more than once')
    }
  })
  runtime.start()
  runtime.stop()
  runtime.stop()
  t.end()
})

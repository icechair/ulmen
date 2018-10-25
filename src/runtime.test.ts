import test from 'tape'
import { ulm, Signal, Effect } from './runtime'
import { stringify } from 'querystring'
test('runtime() should call view() initially', t => {
  const initialState = 1
  ulm({
    init: [initialState],
    update: (_msg, state) => [state],
    view: state => {
      t.equal(state, initialState)
      t.end()
    }
  })
})

test('runtime() should call view() after dispatch', t => {
  let count = 0
  return new Promise(resolve => {
    ulm({
      init: ['init'],
      update: (msg: string, _state) => [msg],
      view: (state, dispatch) => {
        count++
        if (state === 'init') {
          return dispatch('next')
        }
        if (state === 'next') {
          return dispatch('done')
        }
        if (state === 'done') {
          return resolve()
        }
      }
    })
  }).then(() => {
    t.equal(count, 3)
    t.end()
  })
})

test('runtime() should call done() when killed', t => {
  t.plan(1)
  return new Promise(resolve => {
    const initialState = 'state'
    const kill = ulm({
      init: [initialState],
      update: (_msg, state) => [state],
      view: () => undefined,
      done: state => {
        t.equal(state, initialState, 'the state is passed')
        resolve()
      }
    })
    kill()
  })
})

test('runtime() should not call update/view if killed', t => {
  let initialRender = true
  const initialState = 'state'
  return new Promise(resolve => {
    const afterKillEffect: Effect<string> = dispatch => {
      t.equal(typeof dispatch, 'function', 'dispatch is passed')
      setTimeout(() => {
        dispatch('')
        resolve()
      }, 10)
    }
    const kill = ulm({
      init: [initialState, afterKillEffect],
      update: (_msg, state) => {
        t.fail('update() should not be called')
        return [state]
      },
      view: () => {
        if (initialRender) {
          initialRender = false
          t.pass('view() is called once')
          return
        }
        t.fail('view() should not be called more than once')
      }
    })

    kill()
  }).then(() => t.end())
})

test('runtime() should call done() once', t => {
  t.plan(1)
  let initialCall = true
  const kill = ulm({
    init: [''],
    update: (_msg, state) => [state],
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
  kill()
  kill()
})

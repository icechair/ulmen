import test from 'tape'
import { runtime, Dispatch } from './runtime'
test('runtime() should call view() initially', t => {
  const initialState = 1
  runtime({
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
    runtime({
      init: ['init'],
      update: (msg, _state) => [msg.type],
      view: (state, dispatch) => {
        count++
        if (state === 'init') {
          return dispatch({ type: 'next' })
        }
        if (state === 'next') {
          return dispatch({ type: 'done' })
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
    const kill = runtime({
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
    const afterKillEffect = (dispatch: Dispatch) => {
      t.equal(typeof dispatch, 'function', 'dispatch is passed')
      setTimeout(() => {
        dispatch('')
        resolve()
      }, 10)
    }
    const kill = runtime({
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
  const kill = runtime({
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

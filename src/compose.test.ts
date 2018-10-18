import test from 'tape'
import {
  mapEffect,
  batchEffects,
  mapProgram,
  batchPrograms,
  assembleProgram
} from './compose'
import { Dispatch, Effect, StateEffect, Program } from './runtime'
import { stringify } from 'querystring'
const id = <T>(x: T) => x
const update = <T>(_msg: T, state: T): StateEffect<T, T> => [state]

const makeEffect = <T>(val: T) => (dispatch: Dispatch<T>) => dispatch(val)
test('mapEffects', t => {
  const rawEffect: Effect<number> = dispatch => {
    dispatch(1)
    dispatch(2)
    dispatch(3)
  }
  const inc = (n: number) => n + 1
  const newEffect = mapEffect(rawEffect, inc)
  const results = [] as any[]
  if (newEffect) {
    newEffect(result => results.push(result))
    t.deepEqual(results, [2, 3, 4])
  } else {
    t.fail('new effect should not be undefined')
  }
  t.end()
})

test('mapEffect() should not wrap a falsy effect', t => {
  /*
    The reasoning for this test is that commands can
    be falsy and not run by the runtime.
    map() should align with this behavior.
  */
  t.doesNotThrow(() => {
    const inc = (n: number) => n + 1
    const newEffect = mapEffect(undefined, inc)
    t.equal(newEffect, undefined)
    t.end()
  })
})

test('mapEffect() should return the result of the effect', t => {
  const rawEffect = () => 1
  const newEffect = mapEffect(rawEffect, id)
  if (newEffect) {
    t.equal(newEffect(id), 1, 'newEffect should return the effect value')
  } else {
    t.fail('newEffect should not be undefined')
  }
  t.end()
})

test('mapEffect() should throw for a truthy non-function-effect', t => {
  t.pass('typescript to the rescue?')
  const badEffect = 10
  // @ts-ignore
  t.throws(() => mapEffect(badEffect, id), /must be functions/)
  t.end()
})
test('mapEffect() should throw for a non-function callback', t => {
  const badCallback = 10
  // @ts-ignore
  t.throws(() => mapEffect(id, badCallback), /must be a function/)
  t.end()
})

test('batchEffects() should return a single effect', t => {
  t.is(typeof batchEffects([]), 'function')
  t.end()
})

test('batchEffects() should pass dispatch to each effect', t => {
  const values = [1, 2, 3]
  const effects = batchEffects(values.map(makeEffect))

  const results = [] as any[]
  effects(result => results.push(result))

  t.deepEqual(results, values)
  t.end()
})

test('batchEffects() should not call falsy values', t => {
  /*
    The reasoning for this test is that commands can
    be falsy and not run by the runtime.
    batch() should align with this behavior.
  */

  t.doesNotThrow(() => {
    // @ts-ignore
    const effects = batchEffects([null, false, undefined, 0])
    if (effects) {
      effects(id)
    } else {
      t.fail('effects should not be undefined')
    }
  })
  t.end()
})

test('batchEffects() should return the effects return values', t => {
  const values = [1, 2, 3]
  const effects = batchEffects(values.map(makeEffect))
  if (effects) {
    t.deepEqual(effects(id), values)
  } else {
    t.fail('effects should not be undefined')
  }
  t.end()
})

test('batchEffects() should throw if any effect is a truthy non-function', t => {
  const badEffect = 10
  const goodEffect = () => ({})
  // @ts-ignore
  t.throws(() => batchEffects([badEffect]), /must be functions/)
  // @ts-ignore
  t.throws(() => batchEffects([badEffect, goodEffect]), /must be functions/)
  t.end()
})

test('mapProgram() should return a done if the original program does', t => {
  const doneProgram = mapProgram(
    {
      init: ['foo'],
      update,
      view: id,
      done(s) {
        t.equal(s, 'foo')
        return id
      }
    },
    id
  )

  const notDoneProgram = mapProgram(
    {
      init: ['bar'],
      update,
      view: id
    },
    id
  )

  if (doneProgram.done) {
    t.is(typeof doneProgram.done, 'function')
    const state = doneProgram.init[0]

    const effect = doneProgram.done(state)
    t.is(typeof effect, 'function')
  } else {
    t.fail('doneProgram.done should not be undefined')
  }

  t.is(notDoneProgram.done, undefined)
  t.end()
})

test('batchPrograms() program.done should call sub program done functions', t => {
  let viewWithDoneCalled = false
  let viewWithoutDoneCalled = false
  const subProgramWithDone: Program<string, string> = {
    init: ['foo', undefined],
    update: (_msg, model) => {
      if (_msg === 'foo-bar') {
        return ['foo-bar']
      }
      return [model]
    },
    view: (model, dispatch) => {
      if (!viewWithDoneCalled) {
        t.equal(model, 'foo', 'the 2nd view should get the correct model')
        viewWithDoneCalled = true
        dispatch('foo-bar')
        return
      }
      t.equal(model, 'foo-bar', 'the 2nd view should be updated')
    },
    done: s => {
      t.equal(s, 'foo')
      t.end()
    }
  }

  const subProgramWithoutDone: Program<string, string> = {
    init: ['bar'],
    update: (_msg, model) => {
      if (_msg === 'bar-foo') {
        return ['bar-foo']
      }
      return [model]
    },
    view: (model, dispatch) => {
      if (!viewWithoutDoneCalled) {
        t.equal(model, 'bar', 'the 2nd view should get the correct model')
        viewWithoutDoneCalled = true
        dispatch('bar-foo')
        return
      }
      t.equal(model, 'bar-foo', 'the 2nd view should be updated')
    }
  }

  return new Promise(resolve => {
    const program = batchPrograms(
      [subProgramWithDone, subProgramWithoutDone],
      views =>
        Promise.all(
          views.map(v => {
            v()
          })
        ).then(() => resolve())
    )

    const [state] = program.init
    program.update({ index: 3, data: '' }, state)
    program.view(state, id)
    if (program.done) {
      program.done(state)
    } else {
      t.fail('batchProgram should have a done property')
    }
  })
})

test('assembleProgram() should return an assembled program', t => {
  t.plan(5)

  const dataOptions = {}
  const logicOptions = {}
  const viewOptions = {}
  const dataResult = {}

  function data(opts?: typeof dataOptions) {
    t.is(opts, dataOptions, 'data options should be present')
    return dataResult
  }

  function logic(d: typeof dataResult, options?: typeof logicOptions) {
    t.is(d, dataResult, 'd should be dataResult')
    t.is(options, logicOptions, 'options should be logicOptions')

    const initial = 0
    return { init: [initial] as StateEffect<number, number>, update }
  }

  function view(
    model: any,
    dispatch: Dispatch<any>,
    options?: typeof viewOptions
  ) {
    t.is(options, viewOptions, 'options should be viewOptions')
  }

  const program = assembleProgram({
    data,
    dataOptions,
    view,
    viewOptions,
    logic,
    logicOptions
  })

  t.deepEqual(program.init, [0])
  program.view(0, id)
  // t.end()
})

import test from 'tape'
import {
  mapEffect,
  batchEffects,
  mapProgram,
  batchPrograms,
  assembleProgram
} from './compose'
import { Dispatch, Effect, StateEffect, Program } from './runtime'
const id = <T>(x: T) => x
const update = <T>(_msg: T, state: T): StateEffect<T> => [state]

const makeEffect = <T>(val: T) => (dispatch: Dispatch) => dispatch(val)
test('mapEffects', t => {
  const rawEffect: Effect = dispatch => {
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
  const subProgramWithDone: Program<string> = {
    init: ['foo', undefined],
    update: (_msg, x) => [x],
    view: () => ({}),
    done: s => {
      t.equal(s, 'foo')
      t.end()
    }
  }

  const subProgramWithoutDone: Program<string> = {
    init: ['bar'],
    update: (_msg, x) => [x],
    view: () => ({})
  }

  const program = batchPrograms([subProgramWithDone, subProgramWithoutDone], id)

  const [state] = program.init
  if (program.done) {
    program.done(state)
  } else {
    t.fail('batchProgram should have a done property')
  }
})

test('assembleProgram() should return an assembled program', t => {
  t.plan(5)

  const dataOptions = {}
  const logicOptions = {}
  const viewOptions = {}
  const dataResult = {}

  function data(options: typeof dataOptions) {
    t.is(options, dataOptions)
    return dataResult
  }

  function logic(d: typeof dataResult, options: typeof dataOptions) {
    t.is(d, dataResult)
    t.is(options, logicOptions)

    return { foo: 'bar' }
  }

  function view(model: any, dispatch: Dispatch, options: typeof viewOptions) {
    t.is(options, viewOptions)
  }

  const program = assembleProgram({
    data,
    dataOptions,
    view,
    viewOptions,
    logic,
    logicOptions
  })

  t.is(program.foo, 'bar')
  program.view()
})

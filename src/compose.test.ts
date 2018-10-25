import test from 'tape'
import { mapEffect, batchEffects, mapUlm, batchUlmen } from './compose'
import { Signal, Effect, StateEffect, Ulm } from './ulm'
const id = <T>(x: T) => x
test('`mapEffects`', t => {
  const rawEffect: Effect<number> = signal => {
    signal(1)
    signal(2)
    signal(3)
  }
  const inc = (n: number) => n + 1
  const newEffect = mapEffect(rawEffect, inc)
  const results = [] as any[]
  if (!newEffect) {
    return t.fail('`newEffect` is undefined')
  }
  newEffect(result => results.push(result))
  t.deepEqual(results, [2, 3, 4])
  t.end()
})

test('`mapEffect` should not wrap a falsy effect', t => {
  t.doesNotThrow(() => {
    const inc = (n: number) => n + 1
    const newEffect = mapEffect(undefined, inc)
    t.equal(newEffect, undefined)
    t.end()
  })
})

test('`mapEffect` should return the result of the effect', t => {
  const rawEffect = () => 1
  const newEffect = mapEffect(rawEffect, id)
  if (!newEffect) {
    return t.fail('`newEffect` is undefined')
  }
  t.equal(newEffect(id), 1, 'newEffect should return the effect value')
  t.end()
})

test('`mapEffect` should throw for a truthy non-function-effect', t => {
  t.pass('typescript to the rescue?')
  const badEffect = 10
  // @ts-ignore
  t.throws(() => mapEffect(badEffect, id), /must be functions/)
  t.end()
})

test('`mapEffect` should throw for a non-function callback', t => {
  const badCallback = 10
  // @ts-ignore
  t.throws(() => mapEffect(id, badCallback), /must be a function/)
  t.end()
})

test('`batchEffects` should return a single effect', t => {
  t.is(typeof batchEffects([]), 'function')
  t.end()
})

test('`batchEffects` should pass `signal` to each effect', t => {
  const values = [1, 2, 3]
  const effects = batchEffects(
    values.map(v => (signal: Signal<number>) => signal(v))
  )

  const results = [] as any[]
  effects(result => results.push(result))

  t.deepEqual(results, values)
  t.end()
})

test('`batchEffects` should not call falsy values', t => {
  t.doesNotThrow(() => {
    // @ts-ignore
    const effects = batchEffects([null, false, undefined, 0, ''])
    if (!effects) {
      return t.fail('`effects` is undefined')
    }
    effects(id)
  })
  t.end()
})

test('`batchEffects` should return the effects return values', t => {
  const values = [1, 2, 3]
  const effects = batchEffects(
    values.map(v => (signal: Signal<number>) => signal(v))
  )
  if (!effects) {
    return t.fail('effects is undefined')
  }
  t.deepEqual(effects(id), values)
  t.end()
})

test('`batchEffects` should throw if any effect is a truthy non-function', t => {
  const badEffect = 10
  const goodEffect = () => ({})
  // @ts-ignore
  t.throws(() => batchEffects([badEffect]), /must be functions/)
  // @ts-ignore
  t.throws(() => batchEffects([badEffect, goodEffect]), /must be functions/)
  t.end()
})

test('`mapUlm` should return a done if the original ulm does', t => {
  const doneUlm = mapUlm(
    {
      init: { model: 'foo' },
      update: (msg, state) => {
        if (msg === 'foo') {
          return { model: 'update-foo' }
        }
        return { model: state }
      },
      view: state => {
        t.pass('view called')
        return `view: ${state}`
      },
      done(s) {
        t.equal(s, 'foo')
        return s
      }
    },
    id
  )

  const notDoneUlm = mapUlm(
    {
      init: { model: 'bar' },
      update: (_, model) => ({ model }),
      view: id
    },
    id
  )

  if (doneUlm.done) {
    t.is(typeof doneUlm.done, 'function')
    t.is(
      doneUlm.view(doneUlm.init.model, id),
      'view: foo',
      'view should return correctly'
    )
    let next = doneUlm.update('foo', doneUlm.init.model)
    t.equal(next.model, 'update-foo', 'update shold still work')
    t.equal(next.effect, undefined, 'update shold still work')

    next = doneUlm.update('blap', doneUlm.init.model)
    const state = doneUlm.init.model

    const effect = doneUlm.done(state)
    t.is(effect, 'foo')
  } else {
    t.fail('doneUlm.done should not be undefined')
  }

  t.is(notDoneUlm.done, undefined)
  t.end()
})

test('`batchUlmen().done` should call sub ulm done functions', t => {
  let viewWithDoneCalled = false
  let viewWithoutDoneCalled = false
  const subUlmWithDone: Ulm<string, string> = {
    init: { model: 'foo' },
    update: (_msg, model) => {
      if (_msg === 'foo-bar') {
        return { model: 'foo-bar' }
      }
      return { model }
    },
    view: (model, signal) => {
      if (!viewWithDoneCalled) {
        t.equal(model, 'foo', 'the 2nd view should get the correct model')
        viewWithDoneCalled = true
        signal('foo-bar')
        return
      }
      t.equal(model, 'foo-bar', 'the 2nd view should be updated')
    },
    done: s => {
      t.equal(s, 'foo')
      t.end()
    }
  }

  const subUlmWithoutDone: Ulm<string, string> = {
    init: { model: 'bar' },
    update: (_msg, model) => {
      if (_msg === 'bar-foo') {
        return { model: 'bar-foo' }
      }
      return { model }
    },
    view: (model, signal) => {
      if (!viewWithoutDoneCalled) {
        t.equal(model, 'bar', 'the 2nd view should get the correct model')
        viewWithoutDoneCalled = true
        signal('bar-foo')
        return
      }
      t.equal(model, 'bar-foo', 'the 2nd view should be updated')
    }
  }

  return new Promise(resolve => {
    const ulm = batchUlmen([subUlmWithDone, subUlmWithoutDone], views =>
      Promise.all(
        views.map(v => {
          v()
        })
      ).then(() => resolve())
    )

    const { model } = ulm.init
    let next = ulm.update({ index: 3, data: '' }, model)
    t.equal(next.model, model, 'unknown messages should not modify state')
    next = ulm.update({ index: 0, data: 'foo-bar' }, model)
    t.deepEqual(
      next.model,
      ['foo-bar', 'bar'],
      'the correct ulm should be updated'
    )
    ulm.view(model, id)
    if (ulm.done) {
      ulm.done(model)
    } else {
      t.fail('batchUlm should have a done property')
    }
  })
})

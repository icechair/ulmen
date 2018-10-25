> Elm architecture in JavaScript

```
npm install ulmen
```

## Example

```js
import { ulmen } from 'ulmen'

const runtime = ulmen({
  init: { model: 0 }, // Model is an integer to count
  update(message, state) {
    return { model: state + 1 } // Increment the model
  },
  view(state, dispatch) {
    const keepCounting = window.confirm(`Count is ${state}. Increment?`)
    if (keepCounting) {
      dispatch()
    }
  }
})
runtime.start()
```

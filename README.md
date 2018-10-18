> Elm architecture in JavaScript

> [Raj][1] implementation in TypeScript

```
npm install ulmen
```

## Example

```js
import { runtime } from 'ulmen'

runtime({
  init: [0], // State is an integer to count
  update(message, state) {
    return [state + 1] // Increment the state
  },
  view(state, dispatch) {
    const keepCounting = window.confirm(`Count is ${state}. Increment?`)
    if (keepCounting) {
      dispatch()
    }
  }
})
```

[1]: https://github.com/andrejewski/raj

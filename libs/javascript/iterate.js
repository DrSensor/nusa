/** @template {_ESclass} T
 ** @typedef {import("../../core/js/iterate.js").IterFunction<T>} IterFunction */
/** @typedef {import("../../core/js/types.d.ts").ESclass} _ESclass */

import iterate, { IterateController } from "../../core/js/iterate.js";

/** iterate over class instances
@template {_ESclass} T

@param Class{T}
@param callback{IterFunction<T>}

@param options{object}
@param options.controller{IterateController<T>}

@example
```ts
iterate.for(Position, (i, { x, y }) => {
  x[i] += 1
  y[i] += 2
})
```
*/ const forEach = (Class, callback, options = { controller }) =>
  iterate(Class, callback, options);

const controller = new IterateController();

/** skip propagating & rendering updated value when iterating over class instances
@param index{number=} - skip update at certain index
@example
```ts
iterate.for(Position, (i, { x, y }) => {
  const distance = Math.sqrt(x[i] ** 2 + y[i] ** 2)
      , prevDistance = i ? Math.sqrt(x[i-1] ** 2 + y[i-1] ** 2) : 0
      , diff = distance - prevDistance

  if (y[i] > 100) {
    iterate.skip("y")
    x[i] = y[i]
    return
  }

  if (diff == 0) iterate.skip(i-1) // don't render previous computation
  else if (diff > 5) {
    x[i] += 1
    y[i] += 2
  } else iterate.skip()
})
```
*/ export const skip = controller.skip.bind(controller);

/** stop iteration
@example
```ts
iterate.for(Position, (i, { x, y }) => {
  if (i < 100) {
    x[i] += 1
    y[i] += 2
  } else iterate.stop()
})
```
*/ export const stop = controller.stop.bind(controller);

export { forEach as for, IterateController as Controller };

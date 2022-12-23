import type { ESclass } from "../../core/types.ts";
import iter, {
  IterateController,
  type IterFunction,
} from "../../core/iterate.ts";

/** iterate over class instances
  @example
  ```ts
  iterate.for(Position, (i, { x, y }) => {
    x[i] += 1
    y[i] += 2
  })
  ``` */
const iterate = <T extends ESclass>(
  Class: T,
  callback: IterFunction<T>,
  options = { controller },
) => iter(Class, callback, options);

const controller = new IterateController();

/** skip propagating & rendering updated value when iterating over class instances
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
  ``` */
export const skip = controller.skip.bind(controller);

/** stop iteration
  @example
  ```ts
  iterate.for(Position, (i, { x, y }) => {
    if (i < 100) {
      x[i] += 1
      y[i] += 2
    } else iterate.stop()
  })
  ``` */
export const stop = controller.stop.bind(controller);

export { iterate as for, IterateController as Controller };

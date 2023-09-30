import type { AccessorBinder } from "./registry.js";
import type { ESclass, SoA, StructFrom } from "./types.d.ts";

export type WeakFlow = WeakMap<Controller, Pipeline>;
export type Pipeline = [
  access: <T extends ESclass>(
    members: Record<string, AccessorBinder>,
    callback: IterFunction<T>,
  ) => readonly [accessorNames: string[], databanks: unknown[][]],
  iterate: <T extends ESclass>(
    length: number,
    callback: IterFunction<T>,
  ) => Set<number>,
  restore: (skips: Iterable<number>) => void,
];

export type IterFunction<T extends ESclass> = (
  index: number,
  data: SoA<T["prototype"]>,
) => void;

type currentIndex = number;
export interface Controller {
  /** skip propagating & rendering updated value when iterating over class instances
    @example
    ```ts
    const iter = new iterate.Controller()
    iterate.for(Position, (i, { x, y }) => {
      const distance = Math.sqrt(x[i] ** 2 + y[i] ** 2)
          , prevDistance = i ? Math.sqrt(x[i-1] ** 2 + y[i-1] ** 2) : 0
          , diff = distance - prevDistance

      if (y[i] > 100) {
        iter.skip("y")
        x[i] = y[i]
        return
      }

      if (diff == 0) iter.skip(i-1)//━╸don't render previous computation
      else if (diff > 5) {
        x[i] += 1
        y[i] += 2
      } else iter.skip()
    }, { controller: iter })
    ```
    */ skip(index?: number): currentIndex | undefined;
  // skip(...accessors: string[]): currentIndex;
  // skip(strings: string[], ...$: ESclass[]): currentIndex;

  /** stop iteration
    @example
    ```ts
    const iter = new iterate.Controller()
    iterate.for(Position, (i, { x, y }) => {
      if (i < 100) {
        x[i] += 1
        y[i] += 2
      } else iter.stop()
    }, { controller: iter })
    ```
    */ stop(): number | undefined;
}

type MemberAccess = Record<string, AccessorBinder>;
type Backup = Map<number, StructFrom<SoA>>;

////////////////////////////////////////////////////

/** iterate over class instances
@example
```ts
const controller = new iterate.Controller()
iterate.for(Position, (i, { x, y }) => {
  x[i] += 1
  y[i] += 2
},{ controller })
```
*/ export default function <T extends ESclass>(
  Class: T,
  callback: IterFunction<T>,
  options: { controller: IterateController },
): void;

export class IterateController implements Controller {
  stop(): number | undefined;
  skip(index?: number | undefined): number | undefined;
}
declare namespace __IterateController__ {
  namespace constructor {
    /** Access {@link members} to iterate */
    const access: (
      members: Record<string, AccessorBinder>,
      callback: IterFunction<ESclass>,
    ) => readonly [string[], unknown[][]];

    /** Iterate members by index based on {@link length} */
    const iterate: (
      length: number,
      callback: IterFunction<ESclass>,
    ) => Set<number>;

    /** Restore some values when `iterate.skip()`, preventing bounded value to be updated */
    const restore: (skips: Iterable<number>) => void;
  }
}

declare let dedupeUpdate: VoidFunction | undefined;
declare let currentAccess: SoA | undefined;
declare let memberAccess: Record<string, AccessorBinder> | undefined;

declare const flow: WeakFlow;

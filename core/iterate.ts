import type { ESclass, Prototype } from "./types.ts";
import registry, { type AccessorBinder } from "./registry.ts";
import { update } from "./accessor.ts";
import * as task from "./task.ts";

/** iterate over class instances
  @example
  ```ts
  const controller = new iterate.Controller()
  iterate.for(Position, (i, { x, y }) => {
    x[i] += 1
    y[i] += 2
  },{ controller })
  ``` */
export default <T extends ESclass>(
  Class: T,
  callback: IterFunction<T>,
  { controller }: { controller: IterateController<T> },
) => {
  dedupeUpdate?.();
  const [access, iterate, restore] = flow.get(controller)!;

  const [, members] = registry.get(Class.prototype)!,
    [accessors, arrays] = access(members, callback);

  const length = Math.min(...arrays.map((the) => the.length)),
    skips = [...iterate(length, callback)];

  dedupeUpdate = task.render(() => {
    for (const accessor of accessors) {
      // if (skipAccess.has(accessor)) continue; // TODO: skip render update of specific accessor
      for (let i = length, limit = skips.pop(); i--;) {
        if (i === limit) {
          limit = skips.pop();
          continue;
        }
        const member = members[accessor];
        update(member.databank_, member.targets_, i);
      }
    }
  });

  restore(skips);
};

export class IterateController<
  T extends ESclass,
  ToA extends SoA<T["prototype"]> = SoA<T["prototype"]>, // TODO: replace with assocaited types https://github.com/microsoft/TypeScript/issues/17588
> implements Controller {
  #index?: currentIndex;
  #access = {} as ToA;

  #stopAt = Infinity;
  #skipAt: number[] = [];
  #backup = new Map<number, StructFrom<ToA>>(); // TODO: investigate if V8 Map<number, any> optimized into SparseSet[sparse|indices: number[], dense|values: any[]]

  stop() {
    const index = this.#index;
    if (index !== undefined) this.#stopAt = index;
    return index;
  }

  skip(index?: number) {
    index ??= this.#index;
    if (index !== undefined) {
      this.#skipAt.push(index);
      this.#saveAt(index);
    }
    return index;
  }

  constructor() {
    const access = (
      members: Record<string, AccessorBinder>,
      callback: IterFunction<T>,
    ) => {
      currentAccess = this.#access;
      memberAccess = members;
      callback(this.#index = 0, proxy as ToA); // TODO: check if return Promise, yes? then use concurrent iteration
      currentAccess = memberAccess = undefined;
      return [
        Object.keys(this.#access),
        Object.values(this.#access),
      ] as const;
    };

    const iterate = (length: number, callback: IterFunction<T>) => {
      for (
        let index: number;
        length > (index = ++this.#index!) && this.#stopAt > index;
      ) callback(index, this.#access);
      this.#index = undefined; //━┳╸reset
      this.#stopAt = Infinity; //━┛
      return new Set(this.#skipAt); //━╸dedupe skipped indexes
    };

    const restore = (skips: Iterable<number>) => {
      for (const index of skips) this.#restoreAt(index);
      this.#access = {} as ToA; //━┳╸reset
      this.#skipAt = []; //━━━━━━━━┛
    };

    flow.set(this, [access, iterate, restore]);
  }

  #saveAt(index: number) {
    const save = {} as StructFrom<ToA>;
    for (const accessor in this.#access) {
      const databank = this.#access[accessor]; //@ts-ignore BUG(typescript): can't assign associated type
      save[accessor] = databank[index];
    }
    this.#backup.set(index, save);
  }
  #restoreAt(index: number) {
    const restore = this.#backup.get(index)!;
    for (const accessor in this.#access) { //@ts-ignore BUG(typescript): can't assign associated type
      this.#access[accessor][index] = restore[accessor];
    }
  }
}

let dedupeUpdate: VoidFunction | undefined,
  currentAccess: SoA | undefined,
  memberAccess: Record<string, AccessorBinder> | undefined;

const proxy: SoA = new Proxy({}, {
    get: (_, accessor: string) =>
      currentAccess![accessor] = memberAccess![accessor].databank_,
  }),
  flow = new WeakMap<Controller, [
    access: <T extends ESclass>(
      members: Record<string, AccessorBinder>,
      callback: IterFunction<T>,
    ) => readonly [accessorNames: string[], databanks: unknown[][]],

    iterate: <T extends ESclass>(
      length: number,
      callback: IterFunction<T>,
    ) => Set<number>,

    restore: (skips: Iterable<number>) => void,
  ]>();

export type IterFunction<T extends ESclass> = (
  index: number,
  data: SoA<T["prototype"]>,
) => void;

interface Controller {
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
  ``` */
  skip(index?: number): currentIndex | undefined;
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
  ``` */
  stop(): number | undefined;
}

type SoA<
  T extends Prototype = Prototype,
> = Omit<StructOfArray<T>, "constructor" | symbol>;

type currentIndex = number;

type StructFrom<T> = {
  [key in keyof T]: T[key] extends (infer value)[] ? value : never;
};

type StructOfArray<T> = { // deno-lint-ignore ban-types
  [key in keyof T]: T[key] extends Function ? never : T[key][];
};

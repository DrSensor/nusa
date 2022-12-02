import type { ESclass, Prototype } from "./types.ts";
import registry, { type DataBind, Member, Registry } from "./registry.ts";
import { update } from "./accessor.ts";
import * as task from "./task.ts";

interface Iterate {
  /** iterate over class instances
  @example
  ```ts
  iterate(Position, (i, { x, y }) => {
    x[i] += 1
    y[i] += 2
  })
  ``` */
  <T extends ESclass>(
    Class: T,
    callback: (index: number, data?: SoA<T["prototype"]>) => void,
  ): void;

  /** skip propagating & rendering updated value when iterating over class instances
  @example
  ```ts
  iterate(Position, (i, { x, y }) => {
    const distance = Math.sqrt(x[i] ** 2 + y[i] ** 2)
    if (y[i] > 100) {
      iterate.skip("y")
      x[i] = y[i]
      return
    }
    if (distance > 5) {
      x[i] += 1
      y[i] += 2
    } else iterate.skip(i)
  })
  ``` */
  skip(index: number): currentIndex;
  skip(...accessors: string[]): currentIndex;

  /** stop iteration
  @example
  ```ts
  iterate(Position, (i, { x, y }) => {
    if (i < 100) {
      x[i] += 1
      y[i] += 2
    } else iterate.break
  })
  ``` */
  get stop(): number;
}

const backup = new Map<number, StructFrom<SoA>>();

function saveAt(index: number, access: SoA) {
  const save = {} as StructFrom<typeof access>;
  for (const accessor in access) {
    const databank = access[accessor];
    save[accessor] = databank[index];
  }
  backup.set(index, save);
}

function restoreAt(index: number, access: SoA) {
  const restore = backup.get(index)!;
  for (const accessor in access) {
    access[accessor][index] = restore[accessor];
  }
}

let access = {} as SoA,
  skipAt = [] as number[],
  stopAt = Infinity,
  index: number | undefined;

export const iterate = Object.defineProperties( // TODO: refactor as class which `this`/guard iterate.skip and iterate.stop from being destructured
  ((Class, callback) => {
    dedupeUpdate?.();

    const members = registry.get(Class.prototype)![Registry.members];
    memberAccess = members;
    callback(index = 0, proxyAccess); // cache access // TODO: check if return Promise, yes? then use concurrent iteration
    const length = Math.min(...Object.values(access).map((the) => the.length));
    while (++index < length && stopAt > index) callback(index, access);

    const skips = [...skipAt]; // new Set(skipAt)
    dedupeUpdate = task.render(() => {
      for (const accessor in access) {
        // if (skips.has(accessor)) continue; // TODO: skip render update of specific accessor
        for (let i = length, limit = skips.pop() ?? 0; i--;) {
          if (i === limit) {
            i = limit = skips.pop() ?? 0;
            continue;
          }
          update(members, accessor, i);
        }
        /* Alternative
        for (let i = length; i--;) {
          if (skips.has(i)) continue;
          update(members, accessor, i);
        } */
      }
    });

    for (const skip of skips) restoreAt(skip, access);

    index = undefined;
    stopAt = Infinity;
    skipAt = [];
    access = {};
    memberAccess = undefined;
  }) as Iterate,
  {
    skip: {
      get(): currentIndex | undefined {
        if (index !== undefined) {
          skipAt.push(index);
          saveAt(index, access);
        }
        return index;
      },
    },
    stop: {
      get(): currentIndex | undefined {
        if (index !== undefined) stopAt = index;
        return index;
      },
    },
  },
);

let dedupeUpdate: VoidFunction | undefined,
  memberAccess: Record<string, DataBind> | undefined;
const proxyAccess: SoA = new Proxy({}, {
  get(_, accessor: string) {
    access[accessor] = memberAccess![accessor][Bound.databank];
  },
});

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

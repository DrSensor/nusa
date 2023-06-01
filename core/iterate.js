/** @template {_Prototype} [P=_Prototype]
 ** @typedef {import("./types.d.ts").registry.Cache<P>} _Cache */
/** @typedef {import("./types.d.ts").ESclass} _ESclass */
/** @typedef {import("./types.d.ts").Prototype} _Prototype */
/** @typedef {import("./registry.js").AccessorBinder} _AccessorBinder */
/** @typedef {import("./types.d.ts").iterate.Pipeline} _Pipeline */

import registry from "./registry.js";
import { update } from "./accessor.js";
import * as task from "./task.js";

/** iterate over class instances
@template {_ESclass} T

@param Class{T}
@param callback{IterFunction<T>}

@param options{object}
@param options.controller{IterateController<T>}

@example ```ts
const controller = new iterate.Controller()
iterate.for(Position, (i, { x, y }) => {
  x[i] += 1
  y[i] += 2
},{ controller })
```
*/ export default (Class, callback, { controller }) => {
  dedupeUpdate?.();
  const [access, iterate, restore] = /** @type _Pipeline */ (
    flow.get(controller)
  );

  const [, members] = /** @type _Cache */ (registry.get(Class.prototype)),
    [accessors, arrays] = access(members, callback);

  const length = Math.min(...arrays.map((the) => the.length)),
    skips = [...iterate(length, callback)];

  dedupeUpdate = task.render(() => {
    for (const accessor of accessors) {
      // if (skipAccess.has(accessor)) continue; // TODO: skip render update of specific accessor
      for (let i = length, limit = skips.pop(); i--; ) {
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

/** @template {_Prototype} [T=_Prototype]
 ** @typedef {import("./types.d.ts").SoA<T>} _SoA */
/** @template T
 ** @typedef {import("./types.d.ts").StructFrom<T>} _StructFrom */
/** @template {_ESclass} T
 ** @typedef {import("./types.d.ts").iterate.IterFunction<T>} IterFunction */
/** @typedef {import("./types.d.ts").iterate.Controller} Controller */
/** @typedef {number} currentIndex */

/** @implements Controller
@template {_ESclass} T
@template {_SoA<T["prototype"]>} [ToA=_SoA<T["prototype"]>]
*/ export class IterateController {
  /** @type currentIndex | undefined */
  #index;
  #access = /** @type ToA */ ({});

  #stopAt = Infinity;
  /** @type number[] */
  #skipAt = [];
  /** @type Map<number, _StructFrom<ToA>> */
  #backup = new Map(); // TODO: investigate if V8 Map<number, any> optimized into SparseSet[sparse|indices: number[], dense|values: any[]]

  stop() {
    const index = this.#index;
    if (index !== undefined) this.#stopAt = index;
    return index;
  }

  /** @param index{number=} */
  skip(index) {
    index ??= this.#index;
    if (index !== undefined) {
      this.#skipAt.push(index);
      this.#saveAt(index);
    }
    return index;
  }

  constructor() {
    /** Access {@link members} to iterate
    @param members {Record<string, _AccessorBinder>}
    @param callback {IterFunction<T>}
    */ const access = (members, callback) => {
      currentAccess = this.#access;
      memberAccess = members;
      callback((this.#index = 0), /** @type ToA */ (proxy)); // TODO: check if return Promise, yes? then use concurrent iteration
      currentAccess = memberAccess = undefined;
      return /** @type {const} */ ([
        Object.keys(this.#access),
        Object.values(this.#access),
      ]);
    };

    /** Iterate members by index based on {@link length}
    @param length{number}
    @param callback{IterFunction<T>}
    */ const iterate = (length, callback) => {
      for (
        let /** @type number */ index;
        length > (index = ++/** @type currentIndex */ (this.#index)) &&
        this.#stopAt > index;
      )
        callback(index, this.#access);
      this.#index = undefined; //━┳╸reset
      this.#stopAt = Infinity; //━┛
      return new Set(this.#skipAt); //━╸dedupe skipped indexes
    };

    /** Restore some values when `iterate.skip()`, preventing bounded value to be updated
    @param skips{Iterable<number>}
    */ const restore = (skips) => {
      for (const index of skips) this.#restoreAt(index);
      this.#access = /** @type ToA */ ({}); //━┳╸reset
      this.#skipAt = []; //━━━━━━━━━━━━━━━━━━━━┛
    };

    flow.set(this, [access, iterate, restore]);
  }

  /** @param index{number} */
  #saveAt(index) {
    const save = /** @type _StructFrom<ToA> */ ({});
    for (const accessor in this.#access) {
      const databank = this.#access[accessor]; //@ts-ignore BUG(typescript): can't assign associated type
      save[accessor] = databank[index];
    }
    this.#backup.set(index, save);
  }

  /** @param index{number} */
  #restoreAt(index) {
    const restore = /** @type _StructFrom<ToA> */ (this.#backup.get(index));
    for (const accessor in this.#access) {
      //@ts-ignore BUG(typescript): can't assign associated type
      this.#access[accessor][index] = restore[accessor];
    }
  }
}

let /** @type VoidFunction | undefined */ dedupeUpdate,
  /** @type _SoA | undefined */ currentAccess,
  /** @type Record<string, _AccessorBinder> | undefined */ memberAccess;

/** @typedef {import("./types.d.ts").iterate.WeakFlow} _WeakFlow */

const /** @type _WeakFlow */ flow = new WeakMap(),
  /** @type _SoA */ proxy = new Proxy(
    {},
    {
      get: /** @param accessor{string} */ (_, accessor) =>
        /** @type _SoA */ ((currentAccess)[accessor] =
          /** @type Record<string, _AccessorBinder> */ (memberAccess)[
            accessor
          ].databank_),
    },
  );

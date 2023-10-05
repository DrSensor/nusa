/// <reference types="./iterate.d.ts" />
/** @typedef {import("./iterate.js")} $ */
/** @typedef {import("./iterate.js").Pipeline} P */
/** @typedef {import("./iterate.js").MemberAccess} MemberAccess */
/** @typedef {import("./iterate.js").Backup} Backup */
/** @typedef {import("./registry.js").AccessorBinder} AccessorBinder */
/** @typedef {import("./registry.js").Cache} Cache */
/** @template T
 ** @typedef {import("./types.d.ts").StructFrom<T>} StructFrom */
/** @typedef {import("./types.d.ts").SoA} SoA */
import { update } from "./bind/accessor.js";
import registry from "./registry.js";
import * as task from "./utils/task.js";

/** @type $["default"] */
export default function (Class, callback, { controller }) {
  dedupeUpdate?.();
  const [access, iterate, restore] = /** @type P */ (flow.get(controller));

  const [, members] = /** @type Cache */ (registry.get(Class.prototype));
  const [accessors, arrays] = access(members, callback);

  const length = Math.min(...arrays.map((the) => the.length));
  const skips = [...iterate(length, callback)];

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
}

/** @type $["IterateController"] */
export class IterateController {
  #index = /** @type number|undefined */ (undefined);
  #access = /** @type SoA */ ({});
  #stopAt = Infinity;
  #skipAt = /** @type number[] */ ([]);
  #backup = /** @type Backup */ (new Map()); // TODO: investigate if V8 Map<number, any> optimized into SparseSet[sparse|indices: number[], dense|values: any[]]

  stop() {
    const index = this.#index;
    if (index !== undefined) this.#stopAt = index;
    return index;
  }

  /** @param index{number=} */
  skip(index) {
    const index_ = index ?? this.#index;
    if (index_ !== undefined) {
      this.#skipAt.push(index_);
      this.#saveAt(index_);
    }
    return index_;
  }

  constructor() {
    /** @type $["__IterateController__"]["constructor"]["access"] */
    const access = (members, callback) => {
      currentAccess = this.#access;
      memberAccess = members;
      this.#index = 0;
      callback(this.#index, proxy); // TODO: check if return Promise, yes? then use concurrent iteration
      currentAccess = memberAccess = undefined;
      return /** @type {const} */ ([
        Object.keys(this.#access),
        Object.values(this.#access),
      ]);
    };

    /** @type $["__IterateController__"]["constructor"]["iterate"] */
    const iterate = (length, callback) => {
      for (
        // TODO: replace `index` with just `this.#index`
        let index = ++/** @type number */ (this.#index);
        length > index && this.#stopAt > index;
        index = ++/** @type number */ (this.#index)
      ) {
        callback(index, this.#access);
      }
      this.#index = undefined; //━┳╸reset
      this.#stopAt = Infinity; //━┛
      return new Set(this.#skipAt); //━╸dedupe skipped indexes
    };

    /** @type $["__IterateController__"]["constructor"]["restore"] */
    const restore = (skips) => {
      for (const index of skips) this.#restoreAt(index);
      this.#access = {}; //━┳╸reset
      this.#skipAt = []; //━━━━━━━━━━━━━━━━━━━━┛
    };

    flow.set(this, [access, iterate, restore]);
  }

  /** @param index{number} */
  #saveAt(index) {
    const save = /** @type StructFrom<SoA> */ ({});
    for (const accessor in this.#access) {
      const databank = this.#access[accessor]; //@ts-ignore BUG(typescript): can't assign associated type
      save[accessor] = databank[index];
    }
    this.#backup.set(index, save);
  }

  /** @param index{number} */
  #restoreAt(index) {
    const restore = /** @type StructFrom<SoA> */ (this.#backup.get(index));
    for (const accessor in this.#access) {
      //@ts-ignore BUG(typescript): can't assign associated type
      this.#access[accessor][index] = restore[accessor];
    }
  }
}

/** @type VoidFunction|undefined */ let dedupeUpdate;
/** @type SoA|undefined */ let currentAccess;
/** @type MemberAccess|undefined */ let memberAccess;

/** @type $["flow"] */ const flow = new WeakMap();
/** @type SoA */ const proxy = new Proxy(
  {},
  {
    get(_, key) {
      const accessor = /** @type string */ (key);
      const current = /** @type SoA */ (currentAccess);
      const member = /** @type MemberAccess */ (memberAccess);
      // I WANT FLOW/FLOTATE 😞 https://github.com/microsoft/TypeScript/issues/48650
      current[accessor] = member[accessor].databank_;
      return current[accessor];
    },
  },
);

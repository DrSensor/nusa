/// <reference types="./number.d.ts" />
// @ts-nocheck unfortunately Ruby .rbs style for type annotation are not working in here and there 😢
/** @typedef {import("./number.js")} $ */
/** @typedef {import("./traits.js").Internal} Internal */
import * as wasm from "../wasm/number.js";
import { Accessor, build } from "./traits.js";
const [accessor, instance] = await Promise.all([
  wasm.accessor(),
  wasm.instance(),
]);

class Number extends Accessor {
  #intrnl = /** @type Internal */ ({});
  get length() {
    return this.#intrnl.len_;
  }

  static new(len) {
    const self = new Number();
    const ptr = instance["num.allocate"](this.TYPE_ID, len, false);
    build.call(self.#intrnl, ptr, len, accessor["num.accessor"](this.TYPE_ID));
    return self;
  }
  [Symbol.for("constructor")]() {
    build.call(
      this.#intrnl,
      ...instance["num.allocateAUTO"](this.constructor.TYPE_ID, false),
      accessor["num.accessor"](this.constructor.TYPE_ID),
    );
  }

  set(value) {
    const self = this.#intrnl;
    accessor["num.set"](self.setter_, self.ptr_, value);
  }
  get() {
    const self = this.#intrnl;
    return accessor["num.get"](self.getter_, self.ptr_);
  }
}

export class Uint8 extends Number {
  static TYPE_ID = 1;
}
export class Int8 extends Number {
  static TYPE_ID = -1;
}

export class Uint16 extends Number {
  static TYPE_ID = 2;
}
export class Int16 extends Number {
  static TYPE_ID = -2;
}

export class Uint32 extends Number {
  static TYPE_ID = 4;
}
export class Int32 extends Number {
  static TYPE_ID = -4;
}
export class Float32 extends Number {
  static TYPE_ID = -128 + 4;
}

export class Uint64 extends Number {
  static TYPE_ID = 8;
}
export class Int64 extends Number {
  static TYPE_ID = -8;
}
export class Float64 extends Number {
  static TYPE_ID = -128 + 8;
}

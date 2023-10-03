import type { Accessor } from "./traits.js";

declare abstract class Number extends Accessor<number> {
  // static abstract readonly TYPE_ID: number;
  readonly length: number;

  static new(len: number): number;
  // @ts-expect-error I don't need unique symbol
  [Symbol.for("constructor")](): void;

  get(): number;
  set(value: number): void;
}

export class Uint8 extends Number {
  static readonly TYPE_ID: 1;
}
export class Int8 extends Number {
  static readonly TYPE_ID: -1;
}

export class Uint16 extends Number {
  static readonly TYPE_ID: 2;
}
export class Int16 extends Number {
  static readonly TYPE_ID: -2;
}

export class Uint32 extends Number {
  static readonly TYPE_ID: 4;
}
export class Int32 extends Number {
  static readonly TYPE_ID: -4;
}
export class Float32 extends Number {
  static readonly TYPE_ID: -124; // -128 + 4
}

export class Uint64 extends Number {
  static readonly TYPE_ID: 8;
}
export class Int64 extends Number {
  static readonly TYPE_ID: -8;
}
export class Float64 extends Number {
  static readonly TYPE_ID: -120; // -128 + 8
}

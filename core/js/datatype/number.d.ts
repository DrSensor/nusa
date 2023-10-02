import type { Accessor } from "./traits.js";

// biome-ignore lint/suspicious/noShadowRestrictedNames: this file doesn't have `Number(coercien)`
declare abstract class Number extends Accessor<number> {
  // static abstract readonly TYPE_ID: number;
  readonly length: number;

  static new(len: number): number;
  // @ts-expect-error I don't need unique symbol
  [Symbol.for("constructor")](): void;

  get(): number;
  set(value: number): void;
}

// biome-ignore lint/complexity/noStaticOnlyClass: typescript problem because it doesn't allow `static abstract field`
export class Uint8 extends Number {
  static readonly TYPE_ID: 1;
}
// biome-ignore lint/complexity/noStaticOnlyClass: typescript problem because it doesn't allow `static abstract field`
export class Int8 extends Number {
  static readonly TYPE_ID: -1;
}

// biome-ignore lint/complexity/noStaticOnlyClass: typescript problem because it doesn't allow `static abstract field`
export class Uint16 extends Number {
  static readonly TYPE_ID: 2;
}
// biome-ignore lint/complexity/noStaticOnlyClass: typescript problem because it doesn't allow `static abstract field`
export class Int16 extends Number {
  static readonly TYPE_ID: -2;
}

// biome-ignore lint/complexity/noStaticOnlyClass: typescript problem because it doesn't allow `static abstract field`
export class Uint32 extends Number {
  static readonly TYPE_ID: 4;
}
// biome-ignore lint/complexity/noStaticOnlyClass: typescript problem because it doesn't allow `static abstract field`
export class Int32 extends Number {
  static readonly TYPE_ID: -4;
}
// biome-ignore lint/complexity/noStaticOnlyClass: typescript problem because it doesn't allow `static abstract field`
export class Float32 extends Number {
  static readonly TYPE_ID: -124; // -128 + 4
}

// biome-ignore lint/complexity/noStaticOnlyClass: typescript problem because it doesn't allow `static abstract field`
export class Uint64 extends Number {
  static readonly TYPE_ID: 8;
}
// biome-ignore lint/complexity/noStaticOnlyClass: typescript problem because it doesn't allow `static abstract field`
export class Int64 extends Number {
  static readonly TYPE_ID: -8;
}
// biome-ignore lint/complexity/noStaticOnlyClass: typescript problem because it doesn't allow `static abstract field`
export class Float64 extends Number {
  static readonly TYPE_ID: -120; // -128 + 8
}

type NullValue = void | null | undefined;

export type Descriptors<T> = ReturnType<
  typeof Object.getOwnPropertyDescriptors<T>
>;

export interface Instance {
  [index: symbol]: number;
  [key: string]: unknown;
}

export interface Prototype extends Instance {
  constructor: ESclass;
}

export interface ESclass extends Instance {
  new (...args: unknown[]): Instance;
  prototype: Prototype;
}

export interface Module {
  default: unknown;
  [key: string]: unknown;
}

export type IntoSet<R> = {
  [k in keyof R]: R[k] extends ArrayLike<infer T> | infer U ? Set<T> | U : R[k];
};

export type SoA<T extends Prototype = Prototype> = Omit<
  StructOfArray<T>,
  "constructor" | symbol
>;

export type StructFrom<T> = {
  [key in keyof T]: T[key] extends (infer value)[] ? value : never;
};

type StructOfArray<T> = { // deno-lint-ignore ban-types
  [key in keyof T]: T[key] extends Function ? never : T[key][];
};

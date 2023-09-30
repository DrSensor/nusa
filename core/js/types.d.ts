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

/** @path ./constant/ */
export namespace constant {
  /** @path ./constant/flags.js */
  export enum Flags {
    none = 0,
    hasBinding = 1 << 0,
    hasListener = 1 << 1,
  }

  /** @path ./constant/colon.js */
  export enum Colon {
    None = 0,
    Attr = -1,
    WebC = 1,
    Event = 3,
    CaptureSelf = 5,
    PreventDefault = 7,
    BubbleEvent = 7,
    CaptureOutside = 8,
    SetProp = 4,
  }

  /** @path ./constant/prefix.js */
  export enum Prefix {
    None = "",
    Self = "self:",

    // TODO: prevent default behaviour via `e.preventDefault()`
    Stealth = "stealth:", // HTMLElement event default behaviour mostly are visual, except `onsubmit` and others
    // TODO: prevent runtime from calling `e.stopPropagation()`
    Bubble = "bubble:",
    // TODO: how?
    Outside = "outside:",
    // TODO: instance.<property> = infer(target.value)
    Set = "set:",
  }
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

type StructOfArray<T> = {
  /* biome-ignore lint/complexity/noBannedTypes: who cares? */ // deno-lint-ignore ban-types
  [key in keyof T]: T[key] extends Function ? never : T[key][];
};

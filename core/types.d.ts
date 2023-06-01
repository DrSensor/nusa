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

/** @path ./query.js */
export namespace query {
  export type Queue = {
    module_: Module;
    attrs_: Attributes;
    flags_: constant.Flags;
  };

  // export type Attributes = Record<"props_" | "events_", Attr[] | undefined>;
  export interface Attributes {
    props_?: Attr[];
    events_?: Attr[];
  }

  // export type Module = Record<"scripts_" | "styles_", string[] | undefined>;
  export interface Module {
    scripts_?: string[];
    styles_?: string[];
  }
}

/** @path ./constant/ */
export namespace constant {
  /** @path ./constant/flags.js */
  export const enum Flags {
    none = 0,
    hasBinding = 1 << 0,
    hasListener = 1 << 1,
  }

  /** @path ./constant/colon.js */
  export const enum Colon {
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
  export const enum Prefix {
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

export namespace registry {
  export type Registry<P extends Prototype> = WeakMap<P, Cache<P>>;

  export type Cache<P extends Prototype> = [
    descriptors: Descriptors<P>,
    members: Record<string, Binder>,
  ];

  export type Binder = AccessorBinder;
  export type AccessorBinder = {
    databank_: unknown[];
    targets_: Targets[];
    dedupeRender_?: VoidFunction;
  };
  type Targets = (Attr | [target: Element, attrName: string] | Text)[];
}

export type SoA<T extends Prototype = Prototype,> = Omit<
  StructOfArray<T>,
  "constructor" | symbol
>;

export type StructFrom<T> = {
  [key in keyof T]: T[key] extends (infer value)[] ? value : never;
};

type StructOfArray<T> = {
  // deno-lint-ignore ban-types
  [key in keyof T]: T[key] extends Function ? never : T[key][];
};

export namespace iterate {
  export type WeakFlow = WeakMap<Controller, Pipeline>;
  export type Pipeline = [
    access: <T extends ESclass>(
      members: Record<string, registry.AccessorBinder>,
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
}

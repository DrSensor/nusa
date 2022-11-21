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

export interface BuildConstructor<T> {
  readonly TYPE_ID: number;
  // biome-ignore format: that double quote MUST NOT be removed
  // biome-ignore lint/complexity/useLiteralKeys: yup! it's biome bug
  "new"(len: number): Build<T>;
  new (): Build<T>;
}
export interface Build<T> extends Accessor<T> {
  // @ts-expect-error I don't need unique symbol
  [Symbol.for("constructor")](): void;
  readonly length: number;
}

export abstract class Accessor<T> {
  abstract get(): T;
  abstract set(value: T): void;

  toString(): string;
  toJSON(): string;
  valueOf(): T;
  value: T;
  [Symbol.iterator](): [getter: () => T, setter: (value: T) => void];
}

export interface Internal {
  ptr_: number;
  len_: number;
  getter_: number;
  setter_: number;
}

export function build(
  this: Internal,
  addr: number,
  len: number,
  accr: [getter: number, setter: number],
): void;

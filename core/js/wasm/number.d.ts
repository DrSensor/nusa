// TODO: replace `biome` with `deno fmt|lint`, the formatter doesn't work here
type i32 = number;
type i64 = number;
type i8 = number;
type u16 = number;
type fn = number;

export interface Instance extends WebAssembly.Exports {
  "num.allocate"(type: i8, length: u16, nullable: boolean): number;
  "num.allocateAUTO"(type: i8, nullable: boolean): [ptr: number, length: u16];
  "num.cABIallocateAUTO"(type: i8, nullable: boolean): i64;
}
export const instance: Promise<Instance>;

export interface Accessor extends WebAssembly.Exports {
  at(index: i32): void;
  "num.accessor"(type: i8): [getter: fn, setter: fn];
  "num.cABIaccessor"(type: i8): i64;
  "num.get"(getter: fn): number;
  "num.set"(setter: fn, value: number): void;
}
export const accessor: Promise<Accessor>;

export interface FastOps extends WebAssembly.Exports {
  "num.bulk.noop"(): void;

  "num.bulk.calc.addVAL"(
    type: i8,
    length: u16,
    skipNull: boolean,
    ptr: i32,
    value: number,
  ): i32;

  "num.bulk.mut.addVAL"(
    type: i8,
    length: u16,
    skipNull: boolean,
    ptr: i32,
    value: number,
  ): void;
}
export const fastops: Promise<FastOps>;

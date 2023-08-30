/// <reference path="../../../node_modules/assemblyscript/std/assembly/index.d.ts" />

// @ts-ignore assemblyscript
@external("table", "set")
declare function tableSet(index: usize, func: funcref): void;

// @ts-ignore assemblyscript
@external("table", "call")
declare function tableCall(index: usize): void;

// @ts-ignore assemblyscript
@external("table", "size")
declare function tableGetSize(): usize;

// @ts-ignore assemblyscript
@external("table", "grow")
declare function tableAdd(count: usize, func: funcref): funcref;

let size: usize;

export function queue(func: funcref): void {
  if (size != tableGetSize()) tableSet(size, func);
  else tableAdd(1, func);
  size += 1;
}

export function exec(): void {
  for (let i: usize = 0; i < size; i++)
    tableCall(i);
}

export function flush(): void {
  size = 0;
}

declare function tableSet(index: usize, func: externref): void;
declare function tableCall(index: usize): void;
declare function tableSize(): usize;
declare function tableGrow(count: usize, func: externref): externref;

let size: usize;

export function queue(func: externref): void {
  if (size != tableSize()) tableSet(size, func);
  else tableGrow(1, func);
  size += 1;
}

export function exec(): void {
  for (let i: usize = 0; i < size; i++) tableCall(i);
}

export function flush(): void {
  size = 0;
}

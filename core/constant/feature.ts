import type * as accessor_ from "../accessor.ts";
import type * as listener_ from "../listener.ts";
export type modules = [
  accessor: [typeof accessor_.override, typeof accessor_.infer] | 0,
  listener: [typeof listener_.queue, typeof listener_.listen] | 0,
];
export const accessor = 0, listener = 1;

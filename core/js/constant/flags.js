/** @typedef {import("../types.d.ts").constant.Flags} Flags */

export const none = /** @type Flags */ (0);

/** @example ```html
<tag :: attribute:=property>
```*/
export const hasBinding = /** @type Flags */ (1 << 0);

/** @example ```html
<tag :: on:event=method>
```*/
export const hasListener = /** @type Flags */ (1 << 1);

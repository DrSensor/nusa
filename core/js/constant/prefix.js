/** @typedef {import("../types.d.ts").constant.Prefix} Prefix */
/** @typedef {import("./colon.js")} Colon */

export const None = /** @type Prefix */ ("");

/** @see Colon.CaptureSelf
@example ```js
element.addEvenListener(event, method, { capture: true })
```*/
export const Self = /** @type Prefix */ ("self:");

/** @see Colon.PreventDefault
 @example ```js
element.addEvenListener(event, e => {
  e.preventDefault()
  method()
})
```*/
export const Stealth = /** @type Prefix */ ("stealth:"); // HTMLElement event default behaviour mostly are visual, except `onsubmit` and others

/** @see Colon.BubbleEvent
@summary Don't call `e.stopPropagation()` */
export const Bubble = /** @type Prefix */ ("bubble:");

/** @see Colon.CaptureOutside
@example ```js
document.addEvenListener(event, e => e.target !== element && method())
```*/
export const Outside = /** @type Prefix */ ("outside:");

/** @see Colon.SetProp
@example ```js
element.addEvenListener(event, e => instance[property] = autocast(e.target.value))
```*/
export const Setter = /** @type Prefix */ ("set:");

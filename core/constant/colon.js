// TODO: remove this file and chnage to new syntax (i.e token-prefix without namespace)

// deno-lint-ignore-file no-irregular-whitespace
/** @typedef {import("../types.d.ts").constant.Colon} Colon */
/** @typedef {import("./prefix.js")} Prefix */

export const None = /** @type Colon */ (0);

/** @example
```html
<tag :: attribute:=property>
```
```js
if (attr.name.endsWith(":"))
  tag[attr.name.slice(0, Colon.Attr)] = instance[attr.value]
```*/
export const Attr = /** @type Colon */ (-1);

/** @example
```html
<tag :: @attribute:=property>
```
WARNING: Most WebC `@prop` are abbreviated so make sure to expand them into valid `Element.<prop>`
```js
if (attr.name.startsWith("@") && attr.name.endsWith(":"))
  tag[expand[attr.name.slice(Colon.WebC, Colon.Attr)]] = instance[attr.value]
```*/
export const WebC = /** @type Colon */ (1);

/** @example
```html
<tag :: on:event=method>
```
Unlike standard EventListener, by default there is no event bubbling
```js
if (attr.name.startsWith("on:"))
  tag.addEventListener(attr.name.slice(Colon.Event), e => {
    e.stopPropagation()
    instance[attr.value]()
  })
```*/
export const Event = /** @type Colon */ (3);

/** @see Prefix.Bubble @example
```html
<tag :: on:event=bubble:method>
```
```js
if (attr.name.startsWith("on:") && attr.value.startsWith(Prefix.Bubble))
  tag.addEventListener(attr.name.slice(Colon.Event), e => {
    instance[attr.value.slice(Colon.BubbleEvent)]()
  })
```*/
export const BubbleEvent = /** @type Colon */ (7);

/** @see Prefix.Self @example
```html
<tag :: on:event=self:method>
```
```js
if (attr.name.startsWith("on:") && attr.value.startsWith(Prefix.Self))
  tag.addEventListener(attr.name.slice(Colon.Event), () => {
    e.stopPropagation()
    instance[attr.value.slice(Colon.CaptureSelf)]()]
  }, { capture: self })
```*/
export const CaptureSelf = /** @type Colon */ (5);

/** @see Prefix.Stealth @example
```html
<tag :: on:event=stealth:method>
```
It's called `stealth` because most default behaviour either can be seen or have side effect
```js
if (attr.name.startsWith("on:") && attr.value.startsWith(Prefix.Stealth))
  tag.addEventListener(attr.name.slice(Colon.Event), e => {
    e.stopPropagation()
    e.preventDefault()
    instance[attr.value.slice(Colon.PreventDefault)]()
  })
```*/
export const PreventDefault = /** @type Colon */ (7);

/** @see Prefix.Outside @example
```html
<tag :: on:event=outside:method>
```
```js
if (attr.name.startsWith("on:") && attr.value.startsWith(Prefix.Outside))
  shadowRoot.addEventListener(attr.name.slice(Colon.Event), e => {
    if (e.target !== tag) instance[attr.value.slice(Colon.CaptureOutside)]()
  })
```*/
export const CaptureOutside = /** @type Colon */ (8);

/** @see Prefix.Set @example
```html
<tag :: on:event=set:property>
```
```js
if (attr.name.startsWith("on:") && attr.value.startsWith(Prefix.Set))
  tag.addEventListener(attr.name.slice(Colon.Event), e => {
    e.stopPropagation()
    instance[attr.value.slice(Colon.SetProp)] = e.target.value
  })
```*/
export const SetProp = /** @type Colon */ (4);

// TODO: <tag :: on:event="throttle250ms-outside:method throttle-self:otherMethod">
// TODO: <tag :: on:event="debounce:method debounce250ms:method">
// TODO: <tag :: on:event="once:method stealth-bubble-once:click">
// TODO: <tag :: on:event=set:prop>

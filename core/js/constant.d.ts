import type * as accessor from "./bind/accessor.js";
import type * as listener from "./bind/listener.js";

export enum Flags {
  none = 0,

  /** @example ```html
  <tag ~ .prop=accessor>
  <tag ~ +attr=accessor>
  ``` */ hasBinding = 1 << 0,

  /** @example ```html
  <tag ~ @event=method>
  ``` */ hasListener = 1 << 1,
}

/** @todo Make it configurable via html similar to importmap.
@example ```html
<script type=attrprefix>{
  "listener": "on:"
}</script>
```
Which can be used to override certain prefix.
*/
export enum AttrPrefix {
  listener = "@",
  propAttr = ".",
  justAttr = "+",
  toggleAttr = "!",
  builtin = "#",
  bakedin = "-",
  marker = "~",
}

/** Modifier */
export enum Mod {
  None = "",

  /** Only trigger handler if `event.target` is the element itself, not from a child or descendant element.
  For example `@click=self:…` handler with children, it give an effect that there is a unclick-able hole.

  usage @example ```html
  <button ~ @click=self:print>
    <!-- print @ click -->
    <div>
      <!-- do nothing -->
    </div>
    <!-- print @ click -->
  </button>
  ```

  implementation @example ```js
  element.addEvenListener(event, method, { capture: true })
  ```

  detail @example ```js
  if (attr.name.startsWith(attrprefix.listener) && attr.value.startsWith(Mod.CaptureSelf))
    tag.addEventListener(attr.name.slice(attrprefix.listener.length), () => {
      e.stopPropagation()
      instance[attr.value.slice(Mod.CaptureSelf.length)]()]
    }, { capture: self })
  ```
  */ CaptureSelf = "self:",

  /** @todo Prevent default behaviour via `e.preventDefault()`
  It's called `stealth` because most default behaviour either can be seen or have side effect.
  For example `@submit=stealth:…` event, it will no longer reload the page.
  While `@click=stealth:…` event, there is no visual cue that `<button>` is being pressed.

  usage @example ```html
  <form ~ @submit=stealth:send>
  ```

  implementation @example ```js
  element.addEvenListener(event, e => {
    e.preventDefault()
    method()
  })
  ```

  detail @example ```js
  if (attr.name.startsWith(attrprefix.listener) && attr.value.startsWith(Mod.PreventDefault))
    tag.addEventListener(attr.name.slice(attrprefix.listener.length), e => {
      e.stopPropagation()
      e.preventDefault()
      instance[attr.value.slice(Mod.PreventDefault.length)]()
    })
  ```
  */ PreventDefault = "stealth:", // HTMLElement event default behaviour mostly are visual, except `onsubmit` and others

  /** @todo Prevent runtime from calling `e.stopPropagation()`.
  Unlike other framework, by default Nusa prevent event bubbling.

  usage @example ```html
  <body @click=dismiss @hover=rotateBackground>
    <button @click=popup @hover=bubble:rotateShadow>Open</button>
  </body>
  ```

  detail @example ```js
  if (attr.name.startsWith(attrprefix.listener) && attr.value.startsWith(Mod.BubbleEvent))
    tag.addEventListener(attr.name.slice(attrprefix.listener.length), e => {
      instance[attr.value.slice(Mod.BubbleEvent)]()
    })
  ```
  */ BubbleEvent = "bubble:",

  /** @todo How? Also, is it needed?

  usage @example ```html
  <dialog ~ @click=outside:dismiss>
    <button autofocus ~ @click=dismiss>Close</button>
  </dialog>
  ```

  implementation @example ```js
  document.addEvenListener(event, e => e.target !== element && method())
  ```

  detail @example ```js
  if (attr.name.startsWith("on:") && attr.value.startsWith(Prefix.Outside))
    shadowRoot.addEventListener(attr.name.slice(Colon.Event), e => {
      if (e.target !== tag) instance[attr.value.slice(Colon.CaptureOutside)]()
    })
  ```
  */ CaptureOutside = "outside:",

  /** @todo `instance.<property> = infer(target.value)`

  usage @example ```html
  <input type=range ~ .value=amount @change=set:amount>
  ```

  implementation @example ```js
  element.addEvenListener(event, e => instance[property] = autocast(e.target.value))
  ```

  detail @example ```js
  if (attr.name.startsWith("on:") && attr.value.startsWith(Prefix.Set))
    tag.addEventListener(attr.name.slice(Colon.Event), e => {
      e.stopPropagation()
      instance[attr.value.slice(Colon.SetProp)] = e.target.value
    })
  ```
  */ SetAccessor = "set:",
}

export enum Feature {
  accessor = 0,
  listener = 1,
}
declare namespace Feature {
  type modules = [accessor: module.accessor, listener: module.listener];
  namespace module {
    type accessor = [typeof accessor.override, typeof accessor.infer];
    type listener = [typeof listener.queue, typeof listener.listen];
  }
}

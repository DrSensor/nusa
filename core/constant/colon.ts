export const None = 0,
  /** `<tag :: attribute:="">` -> `attribute=""` */
  Attr = -1,
  /** `<tag :: on:event="">` -> `tag.addEvenListener(event)` */
  Event = 3,
  /** `<tag :: on:event="self:method">` -> `scope.addEvenListener(event, method, {capture:true})` */
  CaptureSelf = 5,
  /** `<tag :: on:event="stealth:method">` -> `e.preventDefault()` */
  PreventDefault = 7,
  /** `<tag :: on:event="bubble:method">` -> `dontCall(e.stopPropagation)` */
  BubbleEvent = 7,
  /** `<tag :: on:event="outside:method">` -> `scope . e => if (!(e.target instanceof tag)) i.method()` */
  CaptureOutside = 8;

// TODO: <tag :: on:event="throttle250ms-outside:method throttle-self:otherMethod">
// TODO: <tag :: on:event="debounce:method debounce250ms:method">
// TODO: <tag :: on:event="once:method stealth-bubble-once:click">

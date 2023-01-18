export const None = "",
  /** `scope.addEvenListener(event, method, {capture:true})` */
  Self = "self:",
  /** TODO: prevent default behaviour via `e.preventDefault()` */
  Stealth = "stealth:", // HTMLElement event default behaviour mostly are visual, except `onsubmit` and others
  /** TODO: prevent runtime from calling `e.stopPropagation()` */
  Bubble = "bubble:",
  /** TODO: how? */
  Outside = "outside:";

/** @template {_Prototype} T
 ** @typedef {import("./types.d.ts").registry.Registry<T>} Registry */
/** @typedef {import("./types.d.ts").registry.AccessorBinder} AccessorBinder */
/** @typedef {import("./types.d.ts").Prototype} _Prototype */

export const index = Symbol();

/** Setter function to set current {@link event}
@param event_{typeof event}
*/ export const setCurrentEvent = (event_) => {
  event = event_;
};

/** Setter function to set current {@link value}
@template T
@param value_{T}
*/ export const setCurrentValue = (value_) => {
  value = value_;
};

export let /** @type Event | null */ event = null,
  /** @type unknown */ value;

// TODO: consider using Attr or target Element or host Element as a key (maybe 🤔)
/** @type Registry<_Prototype> */
export default new WeakMap();

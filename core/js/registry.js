/// <reference types="./registry.d.ts" />
/** @typedef {import("./registry.js")} $ */

/** @type $["setCurrentEvent"] */
export const setCurrentEvent = (event_) => {
  event = event_;
};

/** @type $["event"] */
export let event;

/** @type $["setCurrentValue"] */
export const setCurrentValue = (value_) => {
  value = value_;
};

/** @type $["value"] */
export let value;

/** @type $["index"] */
export const index = Symbol();

/** @type $["default"] */
export default new WeakMap();

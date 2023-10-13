/// <reference types="./registry.d.ts" />
/** @typedef {import("./registry.js")} $ */

/** @type $["event"] */ export let event;
/** @type $["setCurrentEvent"] */
export const setCurrentEvent = (event_) => {
  event = event_;
};

/** @type $["value"] */ export let value;
/** @type $["setCurrentValue"] */
export const setCurrentValue = (value_) => {
  value = value_;
};

/** @type $["module"] */ export let module;
/** @type $["setCurrentModule"] */
export const setCurrentmodule = (module_) => {
  module = module_;
};

export const index = Symbol();
export default new WeakMap();

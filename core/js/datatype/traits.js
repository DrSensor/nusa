/// <reference types="./traits.d.ts" />
/** @typedef {import("./traits.js")} $ */

// @ts-nocheck can't mark class in .js as abstract class https://github.com/Microsoft/TypeScript/issues/17227

/** @type $["Accessor"] */
export class Accessor {
  toString() {
    return String(this.get());
  }
  toJSON() {
    return JSON.stringify(this.get());
  }
  valueOf() {
    return this.get();
  }
  *[Symbol.iterator]() {
    yield this.get.bind(this);
    yield this.set.bind(this);
  }
  set value(val) {
    this.set(val);
  }
  get value() {
    return this.get();
  }
}

/** @type $["build"] */
export function build(addr, len, [getter, setter]) {
  this.ptr_ = addr;
  this.len_ = len;
  this.getter_ = getter;
  this.setter_ = setter;
}

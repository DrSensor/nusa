/// <reference types="./bind.d.ts" />
/** @typedef {import("./bind.js")} $ */
/** @typedef {import("./registry.js").Cache} Cache */
/** @typedef {import("./types.d.ts").ESclass} ESclass */
import { Feature } from "./constant.js";
import registry, { index } from "./registry.js";

/** @type $["default"] */
export default (features, attrs, scope) => (module) => {
  const Class = /** @type ESclass */ (module.default);
  bind(Class.prototype, attrs, scope, features);
};

let count = 0;

/** @type $["bind"] */
function bind(pc, attrs, scope, get) {
  const [accessor_override, accessor_infer] = get[Feature.accessor] || [];
  const [listener_queue, listener_listen] = get[Feature.listener] || [];
  const id = count++;
  const /** @type Set<string> */ accessors = new Set();
  const /** @type Set<string> */ properties = new Set();

  const notCached = !registry.has(pc);

  const [descs, members] = notCached
    ? [Object.getOwnPropertyDescriptors(pc), {}]
    : /** @type Cache */ (registry.get(pc));
  if (notCached) registry.set(pc, [descs, members]);

  attrs.events_?.forEach(listener_queue);
  attrs.props_?.forEach((attr) =>
    attr.value.split(" ").forEach((propName) => {
      accessor_override(propName, descs, members, attr, id);
      (descs[propName] ? accessors : properties).add(propName);
    }),
  );

  if (notCached && accessors.size) Object.defineProperties(pc, descs);

  const instance = new pc.constructor();
  instance[index] = id;

  accessor_infer?.(properties, accessors, descs, members, instance, id);
  if (notCached && properties.size) Object.defineProperties(pc, descs);

  listener_listen?.(scope, instance);
}

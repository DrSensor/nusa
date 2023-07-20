/** @typedef {import("./types.d.ts").Module} _Module */
/** @typedef {import("./types.d.ts").ESclass} _ESclass */
/** @typedef {import("./types.d.ts").Prototype} _Prototype */
/** @typedef {import("./query.js").Attributes} _query$Attributes */
/** @template {_Prototype} [P=_Prototype]
 ** @typedef {import("./types.d.ts").registry.Cache<P>} _Cache */
/** @typedef {import("./constant/feature.js").modules} _Feature$modules */

import * as Feature from "./constant/feature.js";
import registry, { index } from "./registry.js";

/** Bind properties and methods
@param features{_Feature$modules}
@param attrs{_query$Attributes}
@param scope{ShadowRoot}
@returns {(module: _Module) => void}
*/ export default (features, attrs, scope) => (module) => {
  const Class = /** @type _ESclass */ (module.default);
  bind(Class.prototype, attrs, scope, features);
};

let count = 0;

/** Perform incremental binding
@param pc{_Prototype}
@param attrs{import("./query.js").Attributes}
@param scope{ShadowRoot}
@param get{import("./constant/feature.js").modules}
*/ function bind(pc, attrs, scope, get) {
  const [accessor_override, accessor_infer] = get[Feature.accessor] || [];
  const [listener_queue, listener_listen] = get[Feature.listener] || [];
  const id = count++;
  const /** @type Set<string> */ accessors = new Set();
  const /** @type Set<string> */ properties = new Set();

  const notCached = !registry.has(pc);
  const /** @type _Cache */ [descs, members] = notCached
      ? [Object.getOwnPropertyDescriptors(pc), {}]
      : registry.get(pc);
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

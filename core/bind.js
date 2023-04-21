/** @typedef {import("./types.d.ts").Module} _Module */
/** @typedef {import("./types.d.ts").ESclass} _ESclass */
/** @typedef {import("./types.d.ts").Prototype} _Prototype */
/** @typedef {import("./query.js").Attributes} _query$Attributes */
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
  const [accessor_override, accessor_infer] = get[Feature.accessor];
  const [listener_queue, listener_listen] = get[Feature.listener];
  const cid = count++, access = /** @type string[] */ ([]);

  let notCached;
  const [descs, members] = registry.get(pc) ?? (notCached = /** @type const */ (
    [Object.getOwnPropertyDescriptors(pc), {}]
  ));
  if (notCached) registry.set(pc, [descs, members]);

  attrs.events_?.forEach(/** @type {(attr: Attr) => void} */ (listener_queue));
  if (attrs.props_) {
    attrs.props_.forEach((attr) =>
      attr.value.split(" ").forEach((accessorName) => {
        accessor_override(accessorName, descs, members, attr, cid);
        access.push(accessorName);
      })
    );
    Object.defineProperties(pc, descs);
  }

  const inferFrom = accessor_infer?.(access, members, cid);
  const script = new pc.constructor();
  script[index] = cid;
  inferFrom?.(script);
  listener_listen?.(scope, script);
}

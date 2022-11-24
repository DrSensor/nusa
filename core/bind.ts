import type { ESclass, Module, Prototype } from "./types.ts";

import { Attribute, Bind } from "./query.ts";
import * as accessor from "./accessor.ts";
import registry, { Bound, index } from "./registry.ts";
import * as listener from "./listener.ts";

let count = 0;

export default (scope: ShadowRoot, attrs: Attribute[]) => (module: Module) => {
  const Class = module.default as ESclass;
  bind(Class.prototype, scope, attrs);
};

function bind(pc: Prototype, scope: ShadowRoot, attrs: Attribute[]) {
  const script = new pc.constructor();
  const cid = script[index] = count++;

  let notCached: unknown;
  const [descs, members] = registry.get(pc) ??
    (notCached = [Object.getOwnPropertyDescriptors(pc), {}] as const);
  if (notCached) registry.set(pc, [descs, members]);

  attrs.forEach((attr) => {
    switch (attr._bind) {
      case Bind.Method:
        listener.queue(attr);
        break;
      case Bind.Accessor:
        attr.value.split(" ").forEach((accessorName) => {
          accessor.init(members, accessorName, attr, cid);
          accessor.patchSetter(descs, members, accessorName);
        });
        break;
    }
    // Object.defineProperties(pc, member);
    Object.defineProperties(pc, descs);
  });
  listener.handledBy(scope, script);
}

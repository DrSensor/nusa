import type { ESclass, Module, Prototype } from "./types.ts";

import { Attribute, Bind, ColonFor } from "./query.ts";
import * as accessor from "./accessor.ts";
import registry, { Bound, index } from "./registry.ts";

let count = 0;

export default (attrs: Attribute[]) => (module: Module) => {
  const Class = module.default as ESclass;
  bind(Class.prototype, attrs);
};

function bind(pc: Prototype, attrs: Attribute[]) {
  const script = new pc.constructor();
  const cid = script[index] = count++;

  let notCached: unknown;
  const [descs, members] = registry.get(pc) ??
    (notCached = [Object.getOwnPropertyDescriptors(pc), {}] as const);
  if (notCached) registry.set(pc, [descs, members]);

  attrs.forEach((attr) => {
    switch (attr._bind) {
      case Bind.Method:
        attr.value.split(" ").forEach((methodName) => {
          attr.ownerElement!.addEventListener( // TODO:#22 centralize all listener
            attr.name.slice(ColonFor.Event),
            function (this: Element, ...$: unknown[]) { // @ts-ignore let it crash if field not a method
              script[methodName](...$);
            },
          );
        });
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
}

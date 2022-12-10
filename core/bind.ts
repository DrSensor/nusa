import type { ESclass, Module, Prototype } from "./types.ts";
import type * as listener from "./listener.ts";

import { Attribute, Bind } from "./query.ts";
import * as accessor from "./accessor.ts";
let listener_queue: typeof listener.queue,
  listener_listen: typeof listener.listen;
import registry, { index } from "./registry.ts";

let count = 0;

export default (scope: ShadowRoot, attrs: Attribute[]) => (module: Module) => {
  const Class = module.default as ESclass;
  bind(Class.prototype, scope, attrs);
};

async function bind(pc: Prototype, scope: ShadowRoot, attrs: Attribute[]) {
  const cid = count++, access: string[] = [];

  let notCached: unknown;
  const [descs, members] = registry.get(pc) ??
    (notCached = [Object.getOwnPropertyDescriptors(pc), {}] as const);
  if (notCached) registry.set(pc, [descs, members]);

  for (const attr of attrs) {
    switch (attr._bind) {
      case Bind.Method: {
        if (listener_queue) listener_queue(attr);
        else {
          const { queue, listen } = await import("./listener.ts");
          (listener_queue = queue)(attr);
          listener_listen = listen;
        }
        break;
      }
      case Bind.Accessor:
        attr.value.split(" ").forEach((accessorName) => {
          accessor.init(members, accessorName, attr, cid);
          accessor.patch(descs, members, accessorName);
          access.push(accessorName);
        });
        break;
    }
    Object.defineProperties(pc, descs);
  }

  accessor.getter(true);
  const script = new pc.constructor();
  if (listener_listen) listener_listen(scope, script);
  accessor.infer(access, members, script, script[index] = cid);
  accessor.getter(false);
}

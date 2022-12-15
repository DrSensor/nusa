import type { ESclass, Module, Prototype } from "./types.ts";
import { type Attribute, Bind, Feature, type Features } from "./query.ts";

import registry, { index } from "./registry.ts";

let count = 0;

export default (
  [attrs, scope]: [Attribute[], ShadowRoot],
  features: Features,
) =>
(module: Module) => {
  const Class = module.default as ESclass;
  bind(Class.prototype, attrs, scope, features);
};

function bind(
  pc: Prototype,
  attrs: Attribute[],
  scope: ShadowRoot,
  get: Features,
) {
  const [accessor_override, accessor_infer] = get[Feature.accessor] || [];
  const [listener_queue, listener_listen] = get[Feature.listener] || [];
  const cid = count++, access = accessor_infer && [] as string[];

  let notCached: unknown;
  const [descs, members] = registry.get(pc) ??
    (notCached = [Object.getOwnPropertyDescriptors(pc), {}] as const);
  if (notCached) registry.set(pc, [descs, members]);

  for (const attr of attrs) {
    switch (attr._bind) {
      case Bind.Method: {
        listener_queue!(attr);
        break;
      }
      case Bind.Accessor:
        attr.value.split(" ").forEach((accessorName) => {
          accessor_override!(accessorName, descs, members, attr, cid);
          access!.push(accessorName);
        });
        break;
    }
    Object.defineProperties(pc, descs);
  }

  const inferFrom = accessor_infer?.(access!, members, cid);
  const script = new pc.constructor();
  script[index] = cid;
  inferFrom?.(script);
  listener_listen?.(scope!, script);
}

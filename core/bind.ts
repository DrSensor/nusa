import type { ESclass, Module, Prototype } from "./types.ts";
import { type Attributes } from "./query.ts";
import * as Feature from "./constant/feature.ts";

import registry, { index } from "./registry.ts";

let count = 0;

export default (
  features: Feature.modules,
  attrs: Attributes,
  scope: ShadowRoot,
) =>
(module: Module) => {
  const Class = module.default as ESclass;
  bind(Class.prototype, attrs, scope, features);
};

function bind(
  pc: Prototype,
  attrs: Attributes,
  scope: ShadowRoot,
  get: Feature.modules,
) {
  const [accessor_override, accessor_infer] = get[Feature.accessor] || [];
  const [listener_queue, listener_listen] = get[Feature.listener] || [];
  const cid = count++, access = accessor_infer && [] as string[];

  let notCached: unknown;
  const [descs, members] = registry.get(pc) ??
    (notCached = [Object.getOwnPropertyDescriptors(pc), {}] as const);
  if (notCached) registry.set(pc, [descs, members]);

  attrs.events_?.forEach(listener_queue!);
  if (attrs.props_) {
    attrs.props_.forEach((attr) =>
      attr.value.split(" ").forEach((accessorName) => {
        accessor_override!(accessorName, descs, members, attr, cid);
        access!.push(accessorName);
      })
    );
    Object.defineProperties(pc, descs);
  }

  const inferFrom = accessor_infer?.(access!, members, cid);
  const script = new pc.constructor();
  script[index] = cid;
  inferFrom?.(script);
  listener_listen?.(scope!, script);
}

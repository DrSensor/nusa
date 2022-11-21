import type { ESclass, Module, Prototype } from "../types.ts";

import { Attribute, Bind, ColonFor } from "../query.ts";
import * as accessor from "../accessor/array.ts";
import * as r from "../registry.ts";

let count = 0;

export default (attrs: Attribute[]) => (module: Module) => {
  const Class = module.default as ESclass;
  bind(Class.prototype, attrs);
};

const registry = new WeakMap<Prototype, [
  descriptor: ReturnType<typeof Object.getOwnPropertyDescriptors<Prototype>>,
  reactor: Record<
    string,
    [
      value: unknown,
      targets: Array<Attr | [el: Element, attrName: string] | Text>,
    ]
  >,
]>();

const mark = Symbol();

function bind(pc: Prototype, attrs: Attribute[]) {
  const script = new pc.constructor();
  const cid = script[r.index] = count++;

  let notCached: unknown;
  const [descs, members] = accessor.registry.get(pc) ??
    (notCached = [Object.getOwnPropertyDescriptors(pc), {}] as const);
  if (notCached) accessor.registry.set(pc, [descs, members]);
  // const [member, cache] = registry.get(pc)! ??
  //   (notCached = [Object.getOwnPropertyDescriptors(pc), {}]);
  // if (notCached) registry.set(pc, [member, cache]);

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
          const data = members[accessorName] ??= [[], []];
          data[accessor.Member.targets][cid] ??= [];

          // register initial bind-target
          let targetName: string, targetElement: Element;
          data[accessor.Member.targets][cid].push(
            (targetElement = attr.ownerElement!).getAttributeNode(
              targetName = attr.name.slice(0, ColonFor.Attr),
            ) ?? [targetElement, targetName],
          );

          accessor.patchSetter(descs, members, accessorName);

          /*
          const desc = member[accessorName], { set } = desc;
          const cached = cache[accessorName] ??= [, []];
          let targetName: string, targetElement: Element;
          cached[Reactor.Targets].push(
            (targetElement = attr.ownerElement!).getAttributeNode(
              targetName = attr.name.slice(0, ColonFor.Attr),
            ) ?? [targetElement, targetName],
          );
          // @ts-ignore avoid double override
          if (desc.set![mark]) {
            desc.set = function (value) {
              set!.call(this, value); // not memoized because setter in class should be predictable
              // 👆 run setter first so dev can detect if attribute is empty or not
              if (cached[Reactor.Value] !== value) {
                cached[Reactor.Targets].forEach((target, index) => {
                  if (target instanceof Node) { // @ts-ignore if Attr
                    if (target.ownerElement) target.ownerElement.value = value;
                    target.nodeValue = value; // WARNING(browser): binding just Attr of <input value> is buggy 😩
                  } else {
                    const [el, attrName] = target;
                    el.setAttribute(attrName, value);
                    const attr = cached[Reactor.Targets][index] = el
                      .getAttributeNode(attrName)!; // make Reactor.Targets uniform when all attributes all set...
                    if (attrName === "text") { // ...or not! 😂
                      const text = new Text(value);
                      attr.ownerElement!.replaceChildren(text);
                      cached[Reactor.Targets].push(text);
                    }
                  }
                });
              }
              cached[Reactor.Value] = value;
            };
          } // @ts-ignore marked
          desc.set![mark] = true;
          */
        });
        break;
    }
    // Object.defineProperties(pc, member);
    Object.defineProperties(pc, descs);
  });
}

const enum Reactor {
  Value,
  Targets,
}

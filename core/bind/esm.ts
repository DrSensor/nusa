import { Attribute, Bind, Colon } from "../query.ts";

export default (attrs: Attribute[]) => (module: Module) => {
  const Class = module.default as Class;
  bind(Class.prototype, attrs);
};

/*== bunch of cache registry ==*/
const reactor = new WeakMap<
  Prototype,
  Record<
    string,
    [value: unknown, targets: Array<Attr | [el: Element, attr: string] | Text>]
  >
>();
const descriptor = new WeakMap<
  Prototype,
  ReturnType<typeof Object.getOwnPropertyDescriptors<Prototype>>
>();
/*== --- ==*/
const mark = Symbol();

function bind(pc: Prototype, attrs: Attribute[]) {
  const script = new pc.constructor();

  let notCached: unknown;
  const member = descriptor.get(pc) ??
    (notCached = Object.getOwnPropertyDescriptors(pc));
  if (notCached) descriptor.set(pc, member);

  notCached = undefined;
  const cache = reactor.get(pc) ?? (notCached = {});
  if (notCached) reactor.set(pc, cache);

  attrs.forEach((attr) => {
    switch (attr._bind) {
      case Bind.Method:
        attr.value.split(" ").forEach((methodName) => {
          attr.ownerElement!.addEventListener( // TODO:#22 centralize all listener
            attr.name.slice(Colon.StartWith_on),
            function (this: Element, ...$: unknown[]) { // @ts-ignore let it crash if field not a method
              script[methodName](...$);
            },
          );
        });
        break;
      case Bind.Accessor:
        attr.value.split(" ").forEach((accessorName) => {
          const desc = member[accessorName], { set } = desc;
          const cached = cache[accessorName] ??= [, []];
          let targetName: string, targetElement: Element;
          cached[Reactor.Targets].push(
            (targetElement = attr.ownerElement!).getAttributeNode(
              targetName = attr.name.slice(Colon.Single),
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
                    if (target.ownerElement) target.ownerElement.value = value; // WARNING(browser): binding just Attr of <input value> is buggy 😩 
                    target.nodeValue = value;
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
        });
        break;
    }
    Object.defineProperties(pc, member);
  });
}

const enum Reactor {
  Value,
  Targets,
}

interface Instance {
  [key: string | symbol]: unknown;
}

interface Prototype extends Instance {
  constructor: Class;
}

interface Class extends Instance {
  new (...args: unknown[]): Instance;
  prototype: Prototype;
}

interface Module {
  default: unknown;
  [key: string]: unknown;
}

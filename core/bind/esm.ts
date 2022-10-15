import { Attribute, Bind } from "../query.ts";

export default (attrs: Attribute[]) => (module: Module) => {
  const Class = module.default as Class;
  bind(Class.prototype, attrs);
};

function bind(pc: Prototype, attrs: Attribute[]) {
  const script = new pc.constructor();
  attrs.forEach((attr) => {
    const [type, fields] = attr._bind;
    switch (type) {
      case Bind.Method:
        fields.forEach((methodName) => {
          attr.ownerElement!.addEventListener( // TODO:#22 centralize all listener
            attr.name.slice(3),
            function (this: Element, ...$: unknown[]) { // @ts-ignore let it crash if field not a method
              script[methodName](...$);
            },
          );
        });
        break;
      case Bind.Accessor:
        throw "Not yet implemented";
    }
  });
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

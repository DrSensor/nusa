import type { Descriptors, ESclass, Instance, Prototype } from "../types.ts";
import * as r from "../registry.ts";
import * as task from "../task.ts";

export const enum Registry {
  descriptors,
  members,
}
export const enum Member {
  databank,
  targets,
  dedupe,
}
type DataBind = [
  databank: unknown[],
  targets: (Attr | [target: Element, attr: name] | Text)[][],
  dedupe?: () => void,
];
export const registry = new WeakMap<Prototype, [
  descriptors: Descriptors<Prototype>,
  members: Record<string, DataBind>,
]>();

///////////////////////////////////////////////////////////////////////

const mark = Symbol();

export function patchSetter(
  descs: PropertyDescriptorMap,
  members: Record<string, DataBind>,
  accessor: string,
) {
  const desc = descs[accessor], set = desc.set!;

  // @ts-ignore avoid double override
  if (set[mark]) return; // @ts-ignore!
  set[mark] = true;

  desc.set = function (this: Instance, value) {
    set.call(this, value);

    const index = this[r.index], cache = members[accessor];
    const [databank, , dedupe] = members[accessor];
    if (databank[index] !== value) {
      dedupe?.();
      cache[Member.dedupe] = task.render(() => {
        update(members, accessor, index);
        cache[Member.dedupe] = undefined;
      });
    }
    databank[index] = value;
  };
}

function update(
  members: Record<string, DataBind>,
  accessor: string,
  index: number,
) {
  const [databank, targets] = members[accessor];
  const value = databank[index] as string, targetAt = targets[index];
  targetAt.forEach((target, i) => {
    if (target instanceof Node) {
      // @ts-ignore if target is Attr
      if (target.ownerElement) target.ownerElement.value = value; // WARNING(browser): binding just Attr of <input value> is buggy since it treat the attribute as initial value, not current value
      target.nodeValue = value; // target: Attr | Text
    } else {
      const [el, attrName] = target;
      el.setAttribute(attrName, value);

      const attr = targetAt[i] = el.getAttributeNode(attrName)!; // make members[,targets] uniform when all attributes all set

      if (attrName === "text") { // but it break uniform structure when binding Text content
        const text = new Text(value);
        attr.ownerElement!.replaceChildren(text);
        targetAt.push(text);
      }
    }
  });
}

interface Iterate {
  /** iterate over class instances
  @example
  ```ts
  iterate(Position, (i, { x, y }) => {
    x[i] += 1
    y[i] += 2
  })
  ``` */
  <T extends ESclass>(
    Class: T,
    callback: (index: number, data?: SoA<T["prototype"]>) => void,
  ): void;

  /** skip propagating & rendering updated value when iterating over class instances
  @example
  ```ts
  iterate(Position, (i, { x, y }) => {
    const distance = Math.sqrt(x[i] ** 2 + y[i] ** 2)
    if (y[i] > 100) {
      iterate.skip("y")
      x[i] = y[i]
      return
    }
    if (distance > 5) {
      x[i] += 1
      y[i] += 2
    } else iterate.skip(i)
  })
  ``` */
  skip(index: number): currentIndex;
  skip(...accessors: string[]): currentIndex;

  /** stop iteration
  @example
  ```ts
  iterate(Position, (i, { x, y }) => {
    if (i < 100) {
      x[i] += 1
      y[i] += 2
    } else iterate.break
  })
  ``` */
  get stop(): number;
}

const backup = new Map<number, StructFrom<SoA>>();

function saveAt(index: number, access: SoA) {
  const save = {} as StructFrom<typeof access>;
  for (const accessor in access) {
    const databank = access[accessor];
    save[accessor] = databank[index];
  }
  backup.set(index, save);
}

function restoreAt(index: number, access: SoA) {
  const restore = backup.get(index)!;
  for (const accessor in access) {
    access[accessor][index] = restore[accessor];
  }
}

let access = {} as SoA,
  skipAt = [] as number[],
  stopAt = Infinity,
  index: number | undefined;

export const iterate = Object.defineProperties( // TODO: refactor as class which `this`/guard iterate.skip and iterate.stop from being destructured
  ((Class, callback) => {
    dedupeUpdate();

    const members = registry.get(Class.prototype)![Registry.members];
    memberAccess = members;
    callback(index = 0, proxyAccess); // cache access // TODO: check if return Promise, yes? then use concurrent iteration
    const length = Math.min(...Object.values(access).map((the) => the.length));
    while (++index < length && stopAt > index) callback(index, access);

    const skips = [...skipAt]; // new Set(skipAt)
    dedupeUpdate = task.render(() => {
      for (const accessor in access) {
        // if (skips.has(accessor)) continue; // TODO: skip render update of specific accessor
        for (let i = length, limit = skips.pop() ?? 0; i--;) {
          if (i === limit) {
            i = limit = skips.pop() ?? 0;
            continue;
          }
          update(members, accessor, i);
        }
        /* Alternative
        for (let i = length; i--;) {
          if (skips.has(i)) continue;
          update(members, accessor, i);
        } */
      }
    });

    for (const skip of skips) restoreAt(skip, access);

    index = undefined;
    stopAt = Infinity;
    skipAt = [];
    access = {};
    memberAccess = undefined;
  }) as Iterate,
  {
    skip: {
      get(): currentIndex | undefined {
        if (index !== undefined) {
          skipAt.push(index);
          saveAt(index, access);
        }
        return index;
      },
    },
    stop: {
      get(): currentIndex | undefined {
        if (index !== undefined) stopAt = index;
        return index;
      },
    },
  },
);

let dedupeUpdate = () => {}, memberAccess: Record<string, DataBind> | undefined;
const proxyAccess: SoA = new Proxy({}, {
  get(_, accessor: string) {
    access[accessor] = memberAccess![accessor][Member.databank];
  },
});

type SoA<
  T extends Prototype = Prototype,
> = Omit<StructOfArray<T>, "constructor" | symbol>;

type name = string;

type currentIndex = number;

type StructFrom<T> = {
  [key in keyof T]: T[key] extends (infer value)[] ? value : never;
};

type StructOfArray<T> = { // deno-lint-ignore ban-types
  [key in keyof T]: T[key] extends Function ? never : T[key][];
};

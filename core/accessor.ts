import type { Instance } from "./types.ts";
import { type Binder, Bound, index } from "./registry.ts";
import { ColonFor } from "./query.ts";
import * as task from "./task.ts";

const mark = Symbol();

export function init(
  members: Record<string, Binder>,
  accessor: string,
  attr: Attr,
  index: number,
) {
  const data = members[accessor] ??= [[], []];
  data[Bound.targets][index] ??= [];

  let targetName: string, targetElement: Element;
  data[Bound.targets][index].push(
    (targetElement = attr.ownerElement!).getAttributeNode(
      targetName = attr.name.slice(0, ColonFor.Attr),
    ) ?? [targetElement, targetName],
  );
}

export function infer(
  accessors: string[],
  members: Record<string, Binder>,
  script: Instance,
  index: number,
) {
  getFun = true;
  accessors.forEach((accessor) =>
    members[accessor][Bound.databank][index] = script[accessor]
  );
  getFun = false;
}

let getFun: boolean;

export function patch(
  descs: PropertyDescriptorMap,
  members: Record<string, Binder>,
  accessor: string,
) {
  const cache = members[accessor], [databank, targets] = cache;
  const desc = descs[accessor], { set, get } = desc;

  // @ts-ignore avoid double override
  if (set[mark]) return; // @ts-ignore!
  set[mark] = true;

  desc.get = function (this: Instance) {
    const result = get!.call(this);
    return getFun ? result : databank[this[index]];
  };
  desc.set = function (this: Instance, value) {
    set!.call(this, value);

    const id = this[index];
    if (databank[id] !== value) {
      cache[Bound.dedupe]?.();
      cache[Bound.dedupe] = task.render(() => {
        update(databank, targets, id);
        if (cache.length === 3) cache.pop();
      });
      if (!cache[Bound.dedupe] && cache.length === 3) cache.pop();
    }
    databank[id] = value;
  };
}

export function update(
  databank: Binder[Bound.databank],
  targets: Binder[Bound.targets],
  index: number,
) {
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

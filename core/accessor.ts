import type { Instance } from "./types.ts";
import { type AccessorBinder, index, setCurrentValue } from "./registry.ts";
import * as task from "./task.ts"; // deno-lint-ignore no-unused-vars
import * as ColonFor from "./constant/colon.ts";

const mark = Symbol();

export function override(
  accessor: string,
  descs: PropertyDescriptorMap,
  members: Record<string, AccessorBinder>,
  attr: Attr,
  index: number,
) {
  init(members, accessor, attr, index);
  patch(descs, members, accessor);
}

function init(
  members: Record<string, AccessorBinder>,
  accessor: string,
  attr: Attr,
  index: number,
) {
  const data = members[accessor] ??= { databank_: [], targets_: [] };
  data.targets_[index] ??= [];

  const targetElement = attr.ownerElement!,
    targetName = attr.name.slice(0, -1 /*ColonFor.Attr*/);
  data.targets_[index].push(
    targetElement.getAttributeNode(targetName) ?? [targetElement, targetName],
  );
}

export function infer(
  accessors: string[],
  members: Record<string, AccessorBinder>,
  index: number,
) {
  unpatch = true;
  return (script: Instance) => {
    accessors.forEach((accessor) =>
      members[accessor].databank_[index] = script[accessor]
    );
    unpatch = false;
  };
}

let unpatch: boolean;

function patch(
  descs: PropertyDescriptorMap,
  members: Record<string, AccessorBinder>,
  accessor: string,
) {
  const cache = members[accessor], { databank_, targets_ } = cache;
  const desc = descs[accessor], { set, get } = desc;

  // @ts-ignore avoid double override
  if (set[mark]) return; // @ts-ignore!
  set[mark] = true;

  desc.get = function (this: Instance) {
    if (Object.hasOwn(this, index)) {
      const value = setCurrentValue(databank_[this[index]]),
        returnValue = get!.call(this);
      setCurrentValue(undefined);
      return unpatch ? returnValue : value;
      // TODO: if (no setter) return returnValue
    }
    return get!.call(this);
  };

  desc.set = function (this: Instance, value) {
    if (Object.hasOwn(this, index)) { // TODO: if (no getter) ??
      const id = this[index];
      setCurrentValue(databank_[id]);
      set!.call(this, value);
      setCurrentValue(undefined);

      if (databank_[id] !== value) {
        cache.dedupeRender_?.();
        cache.dedupeRender_ = task.render(() => {
          update(databank_, targets_, id);
          cache.dedupeRender_ = undefined;
        });
      }
      databank_[id] = value;
      unpatch = false;
    } else set!.call(this, value);
  };
}

export function update(
  databank: AccessorBinder["databank_"],
  targets: AccessorBinder["targets_"],
  index: number,
) {
  const value = databank[index] as string, targetAt = targets[index];
  targetAt.forEach((target, i) => {
    if (target instanceof Node) { // target maybe Attr or Text
      const { ownerElement, name } = target as Attr; // @ts-ignore bind Element.prototype.property by default
      if (ownerElement && name in ownerElement) ownerElement[name] = value; // WARNING(browser): binding just Attr of <input value> is buggy since it treat the attribute as initial value, not current value
      else target.nodeValue = value; // then fallback to bind the attribute (or Text if target not instanceof Attr)
    } else {
      const [element, attrName] = target;
      element.setAttribute(attrName, value);

      const attr = targetAt[i] = element.getAttributeNode(attrName)!; // make members[,targets] uniform when all attributes all set

      if (attrName === "text") { // but it break uniform structure when binding Text content
        const text = new Text(value);
        attr.ownerElement!.replaceChildren(text);
        targetAt.push(text);
      }
    }
  });
}

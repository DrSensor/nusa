import type { Instance } from "./types.ts";
import { type DataBind, index, Member } from "./registry.ts";
import * as task from "./task.ts";

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

    const i = this[index], cache = members[accessor];
    const [databank, , dedupe] = members[accessor];
    if (databank[i] !== value) {
      dedupe?.();
      cache[Member.dedupe] = task.render(() => {
        update(members, accessor, i);
        cache[Member.dedupe] = undefined;
      });
    }
    databank[i] = value;
  };
}

export function update(
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

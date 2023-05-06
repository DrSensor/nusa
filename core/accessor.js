/** @typedef {import("./types.d.ts").Instance} _Instance */
/** @typedef {import("./registry.js").AccessorBinder} _AccessorBinder */
/** @typedef {import("./constant/colon.js")} _Colon */

import { index, setCurrentValue } from "./registry.js";
import * as task from "./task.js";

/** Override accessor behaviour described in {@link descs}
After override, you still need to apply it via {@link Object.defineProperties}
@param accessor{string}
@param descs{PropertyDescriptorMap}
@param members{Record<string, _AccessorBinder>}
@param attr{Attr}
@param index{number}
*/ export function override(accessor, descs, members, attr, index) {
  init(members, accessor, attr, index);
  patch(descs, members, accessor);
}

/** Populate registry
@param members{Record<string, _AccessorBinder>}
@param accessor{string}
@param attr{Attr}
@param index{number}
*/ function init(members, accessor, attr, index) {
  const data = members[accessor] ??= { databank_: [], targets_: [] };
  data.targets_[index] ??= [];

  const targetElement = /** @type Element */ (attr.ownerElement),
    targetName = attr.name.slice(0, /** @type _Colon["Attr"] */ (-1));
  data.targets_[index].push(
    targetElement.getAttributeNode(targetName) ?? [targetElement, targetName],
  );
}

/** Autocast accessor value from {@link Attr.value} (string) at runtime
@param accessors{string[]}
@param members{Record<string, _AccessorBinder>}
@param index{number}
@returns {(script: _Instance) => void}
*/ export function infer(accessors, members, index) {
  unpatch = true;
  return (script) => {
    accessors.forEach((accessor) =>
      members[accessor].databank_[index] = script[accessor]
    );
    unpatch = false;
  };
}

let /** @type boolean */ unpatch;
const mark = Symbol();

/** Patch {@link PropertyDescriptor} of certain {@link accessor}
@param descs{Record<accessor, undefined | PropertyDescriptor & { [mark]?: true }>}
@param members{Record<accessor, _AccessorBinder>}
@param accessor{string}
*/ function patch(descs, members, accessor) {
  const cache = members[accessor], { databank_, targets_ } = cache;
  const desc = descs[accessor];

  if (!desc || desc[mark]) return;
  desc[mark] = true;

  const { get, set, value, writable: notAccessor } = desc,
    is = /** @param access{Function=} */ (access) => access ?? notAccessor;
  let propValue = value;

  if (is(get)) {
    desc.get = /** @this _Instance */ function () {
      const getOriginValue = () => get ? get.call(this) : propValue;

      if (Object.hasOwn(this, index)) { // if accessed outisde class constructor()
        const proxyValue = setCurrentValue(databank_[this[index]]),
          originValue = getOriginValue();
        setCurrentValue(undefined);
        return unpatch ? originValue : proxyValue;
        // TODO: if (no setter) return originValue and ??
      }
      return getOriginValue();
    };
  }

  if (is(set)) {
    desc.set = /** @this _Instance */ function (value) {
      const setOriginValue = () =>
        set ? set.call(this, value) : (propValue = value);

      // TODO: if (no getter) ??
      if (Object.hasOwn(this, index)) { // if accessed outside class constructor()
        const id = this[index];
        setCurrentValue(databank_[id]);
        setOriginValue();
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
      } else setOriginValue();
    };
  }

  if (notAccessor) {
    delete desc.value;
    delete desc.writable;
  }
}

/** Update accessor value (pointer) which point into {@link databank} (virtual heap)
@param databank{_AccessorBinder["databank_"]}
@param targets{_AccessorBinder["targets_"]}
@param index{number}
*/ export function update(databank, targets, index) {
  const value = /** @type string */ (databank[index]),
    targetAt = targets[index];
  targetAt.forEach((target, i) => {
    if (target instanceof Node) { // target maybe Attr or Text
      const { ownerElement, name } = /** @type Attr */ (target); // @ts-ignore bind Element.prototype.property by default
      if (ownerElement && name in ownerElement) ownerElement[name] = value; // WARNING(browser): binding just Attr of <input value> is buggy since it treat the attribute as initial value, not current value
      else target.nodeValue = value; // then fallback to bind the attribute (or Text if target not instanceof Attr)
    } else {
      const [element, attrName] = target;
      element.setAttribute(attrName, value);

      const attr = targetAt[i] =
        /** @type Attr */ (element.getAttributeNode(attrName)); // make members[,targets] uniform when all attributes all set

      if (attrName === "text") { // but it break uniform structure when binding Text content
        const text = new Text(value);
        /** @type Element */ (attr.ownerElement).replaceChildren(text);
        targetAt.push(text);
      }
    }
  });
}

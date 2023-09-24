/** @typedef {import("./types.d.ts").Instance} _Instance */
/** @typedef {import("./registry.js").AccessorBinder} _AccessorBinder */
/** @typedef {import("./constant/colon.js")} _Colon */

import { index, setCurrentValue } from "./registry.js";
import * as attrprefix from "./constant/attrprefix.js";
import * as task from "./task.js";

/** Override accessor behaviour described in {@link descs}
After override, you still need to apply it via {@link Object.defineProperties}
@param accessor{string}
@param descs{Record<string, undefined | PropertyDescriptor & { [mark]?: true }>}
@param members{Record<string, _AccessorBinder>}
@param attr{Attr}
@param id{number}
*/ export function override(accessor, descs, members, attr, id) {
  init(members, accessor, attr, id);
  const desc = descs[accessor];
  if (desc && !desc[mark]) {
    desc[mark] = true;
    patch(desc, members[accessor], id);
  }
}

/** Populate registry {@link members}
@param members{Record<string, _AccessorBinder>}
@param accessor{string}
@param attr{Attr}
@param id{number}
@param prefix{string}
*/ function init(members, accessor, attr, id) {
  members[accessor] ??= { databank_: [], targets_: [] };
  const data = members[accessor];
  data.targets_[id] ??= [];

  const targetElement = /** @type Element */ (attr.ownerElement);
  const targetName = attr.name.slice(attrprefix.propAttr.length);
  data.targets_[id].push(
    targetElement.getAttributeNode(targetName) ?? [
      targetElement,
      targetName,
      attr.name.startsWith(attrprefix.builtin) ? builtinSet : undefined,
    ],
  );
}

/** Autocast accessor value from {@link Attr.value} (string) at runtime
@param properties{Set<string>}
@param accessors{Set<string>}
@param descs{Record<string, undefined | PropertyDescriptor & { [mark]?: true }>}
@param members{Record<string, _AccessorBinder>}
@param instance{_Instance}
@param id{number}
*/ export function infer(properties, accessors, descs, members, instance, id) {
  const initData = /** @param field{string} */ (field) => {
    const { databank_ } = members[field];
    if (databank_.length <= id) databank_[id] = instance[field];
  };
  accessors.forEach(initData);
  properties.forEach((property) => {
    if (Object.hasOwn(instance, property)) {
      initData(property);
      descs[property] ??= {
        value: instance[property],
        writable: true,
      };
      const desc = descs[property];
      if (!desc[mark]) {
        desc[mark] = true;
        patch(desc, members[property], id);
      }
      delete instance[property];
    }
  });
}

const mark = Symbol();

/** Patch {@link PropertyDescriptor} of certain {@link accessor}
@param desc{PropertyDescriptor}
@param cache{_AccessorBinder}
@param id{number}
*/ function patch(desc, cache, id) {
  const { databank_, targets_ } = cache;

  const { get, set, value, writable: notAccessor } = desc;
  const is = /** @param access{Function=} */ (access) => access ?? notAccessor;
  let propValue = value;
  let /** @type boolean */ assignedInConstructor;

  if (is(get)) {
    desc.get = /** @this _Instance */ function () {
      let value;
      if (this[index] !== undefined) {
        // if accessed OUTSIDE class constructor()
        value = databank_[this[index]];
        if (get) {
          setCurrentValue(value);
          get.call(this);
          setCurrentValue(undefined);
        }
      } else {
        // if accessed INSIDE class constructor()
        value = get ? get.call(this) : propValue;
        if (!assignedInConstructor) databank_[id] = value;
      }
      return value;
    };

    if (is(set)) {
      desc.set = /** @this _Instance */ function (value) {
        // TODO: if (no getter) ??
        if (this[index] !== undefined) {
          // if accessed OUTSIDE class constructor()
          const id = this[index];

          if (set) {
            setCurrentValue(databank_[id]);
            set.call(this, value);
            setCurrentValue(undefined);
          }

          if (databank_[id] !== value) {
            cache.dedupeRender_?.();
            cache.dedupeRender_ = task.render(() => {
              update(databank_, targets_, id);
              cache.dedupeRender_ = undefined;
            });
          }
          databank_[id] = value;
        } else {
          // if accessed INSIDE class constructor()
          assignedInConstructor = true;
          if (set) set.call(this, value);
          else propValue = value;
        }
      };
    }

    if (notAccessor) {
      // rome-ignore lint/performance/noDelete: property descriptors must not specify a value or be writable when a getter or setter has been specified //
      delete desc.value; // rome-ignore lint/performance/noDelete:--------------------------------------------------------------------------------------//
      delete desc.writable; //--------------------------------------------------------------------------------------------------------------------------//
    }
  }
}

/** Update accessor value (pointer) which point into {@link databank} (virtual heap)
@param databank{_AccessorBinder["databank_"]}
@param targets{_AccessorBinder["targets_"]}
@param id{number}
@todo use DOM Parts Imperative API (only when it's adopted by Chrome)
*/ export function update(databank, targets, id) {
  const value = /** @type string */ (databank[id]);
  const targetAt = targets[id];
  targetAt.forEach((target, i) => {
    // NOTE `target` can be Attr or Text
    else if (target instanceof Node) {
      const { ownerElement, name } = /** @type Attr */ (target); // @ts-ignore bind Element.prototype.property by default
      if (ownerElement && name in ownerElement) {
        ownerElement[name] = value; // WARNING(browser): binding just Attr of <input value> is buggy since it treat the attribute as initial value, not current value
      } else target.nodeValue = value; // fallback to bind the attribute (or Text if target not instanceof Attr)
    } else {
      const [element, attrName, builtinSet] = target;
      let builtinTarget;
      if (!(builtinTarget = builtinSet?.[attrName](element, value))) {
        element.setAttribute(attrName, value);
        targetAt[i] = /** @type Attr */ (element.getAttributeNode(attrName));
      } else targetAt.push(builtinTarget); // may break uniform structure when binding Text or HTML content
    }
  });
}

export const builtinSet = {
  /** replace element Text content
  @param element{HTMLElement}
  @param value{string}
  @returns {Text} */ text(element, value) {
    const text = new Text(value);
    element.replaceChildren(text);
    return text;
  },
};

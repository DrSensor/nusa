/// <reference types="./accessor.d.ts" />
/** @typedef {import("./accessor.js")} $ */
/** @typedef {import("../types.d.ts").Instance} Instance */
import * as attrprefix from "../constant/attrprefix.js";
import { index, setCurrentValue } from "../registry.js";
import * as task from "../utils/task.js";

/** @ts-ignore @type $["mark"] */
const mark = Symbol();

/** @type $["override"] */
export function override(accessor, descs, members, attr, id) {
  init(members, accessor, attr, id);
  const desc = descs[accessor];
  if (desc && !desc[mark]) {
    desc[mark] = true;
    patch(desc, members[accessor], id);
  }
}

/** @type $["init"] */
function init(members, accessor, attr, id) {
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

/** @type $["infer"] */
export function infer(properties, accessors, descs, members, instance, id) {
  const initData = /** @param field{string} */ (field) => {
    const { databank_ } = members[field];
    if (databank_.length <= id) databank_[id] = instance[field];
  };
  accessors.forEach((property) => {
    initData(property);
    if (Object.hasOwn(instance, property)) delete instance[property];
  });
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

/** @type $["patch"] */
function patch(desc, cache, id) {
  const { databank_, targets_ } = cache;

  const { get, set, value, writable: notAccessor } = desc;
  const is = /** @param access{Function=} */ (access) => access ?? notAccessor;
  let propValue = value;
  let /** @type boolean */ assignedInConstructor;

  if (is(get)) {
    desc.get = /** @this Instance */ function () {
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
      desc.set = /** @this Instance */ function (value) {
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

    if (notAccessor) { // property descriptors must not specify a value or be writable when a getter or setter has been specified
      delete desc.value;
      delete desc.writable;
    }
  }
}

/** @type $["update"]
@todo use DOM Parts Imperative API (only when it's adopted by Chrome)
*/ export function update(databank, targets, id) {
  const value = /** @type string */ (databank[id]);
  const targetAt = targets[id];
  targetAt.forEach((target, i) => {
    if (/** @type Attr|Text */ (target) instanceof Node) {
      const { ownerElement, name } = /** @type Attr */ (target);

      if (ownerElement && name in ownerElement) {
        // @ts-ignore else fallback to Attr.prototype.nodeValue WARNING: `name` with all CAPITAL letter are readonly
        ownerElement[name] = value; // WARNING(browser): binding just Attr of <input value> is buggy since it treat the attribute as initial value, not current value
      } // fallback to bind the attribute (or Text if target not instanceof Attr)
      else target.nodeValue = value;
    } else {
      const [element, attrName, builtinSet] = target;
      // @ts-ignore `attrName` will always be member of `builtinSet` if `builtinSet` not `undefined`
      const builtinTarget = builtinSet?.[attrName](element, value);

      if (builtinTarget instanceof Node) targetAt[i] = builtinTarget;
      else {
        const attr = element.getAttributeNode(attrName);
        if (attr) {
          attr.value = value;
          targetAt[i] = attr;
        } // @ts-ignore `attrName` is always lowercase (no readonly CAPITAL_PROP)
        else element[attrName] = value;
      } // may break uniform structure of array `targetAt` when binding Text or HTML content
    }
  });
}

/** @type $["builtinSet"] */
const builtinSet = {
  text(element, value) {
    const text = new Text(value);
    element.replaceChildren(text);
    return text;
  },
  html(element, value) {
    element.setHTML(value, { sanitizer });
  },
};

const sanitizer = new Sanitizer({
  dropElements: ["link", "script", "style"],
  blockElements: ["template"],
});

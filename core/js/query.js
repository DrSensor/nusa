/// <reference types="./query.d.ts" />
/** @typedef {import("./query.js")} $ */
/** @typedef {import("./query.js").LinkAs} LinkAs */
import { AttrPrefix as attrprefix, Flags } from "./constant.js";

/** @type $["default"] */
export default function (host, HostElement, queue) {
  const elements = host.getElementsByTagName("*");
  const { module_ } = queue;

  registerBindable(host, queue);

  for (const element of elements) {
    if (element instanceof HostElement) continue;
    if (element instanceof HTMLLinkElement) {
      const as = /** @type LinkAs */ (element.getAttribute("as"));
      switch (as) {
        case "script":
          module_.scripts_ ??= [];
          module_.scripts_.push(element.href);
          break;
        case "style":
          module_.styles_ ??= [];
          module_.styles_.push(element.href);
          break;
      }
    }

    registerBindable(element, queue);
  }
}

/** @type $["registerBindable"] */
function registerBindable(host, queue) {
  if (host.hasAttribute(attrprefix.marker)) {
    for (const attr of host.attributes) {
      if (attr.name === attrprefix.marker) continue;
      if (
        attr.name.startsWith(attrprefix.propAttr) ||
        attr.name.startsWith(attrprefix.builtin)
      ) {
        queue.flags_ |= Flags.hasBinding;
        queue.attrs_.props_ ??= [];
        queue.attrs_.props_.push(attr);
      } else if (attr.name.startsWith(attrprefix.listener)) {
        queue.flags_ |= Flags.hasListener;
        queue.attrs_.events_ ??= [];
        queue.attrs_.events_.push(attr);
      }
    }
  }
}

/** @typedef {import("./types.d.ts").query.Attributes} Attributes */
/** @typedef {import("./types.d.ts").query.Queue} Queue */
/** @typedef {"script" | "style"} LinkAs @link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as */

import * as attrprefix from "./constant/attrprefix.js";

/** Get bindable attribute nodes and url module paths
@param host{Element} - query scope
@param HostElement{CustomElementConstructor} - exclude custom-element
@param queue{Queue} - queue every query into an object
@param sep{string} - make query faster by looking that specific attribute
*/ export default (host, HostElement, queue) => {
  const elements = host.getElementsByTagName("*");
  const { module_ } = queue;

  registerBindable(host, queue);

  for (const element of elements) {
    if (element instanceof HostElement) continue;
    if (element instanceof HTMLLinkElement) {
      /** @type LinkAs */
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
};

/** @enum import("./constant/flags.js").Flags */
import * as Flags from "./constant/flags.js";

/** Queue and register {@link Attr} and it's {@link Flags}
@param host{Element}
@param sep{string}
@param queue{Queue}
*/ function registerBindable(host, queue) {
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

import * as Flags from "./constant/flags.ts";

export type Queue = {
  module_: { scripts_?: string[]; styles_?: string[] };
  attrs_: Attributes;
  flags_: Flags.type;
};

/** Get bindable attribute nodes and url module paths
@param host - query scope
@param excludes - exclude element if it instance of Element
@param queue - queue every query into an object
@param sep - make query faster by looking that specific attribute
*/
export default (
  host: Element,
  excludes: typeof Element[],
  queue: Queue,
  sep = "::",
) => {
  const elements = host.getElementsByTagName("*");
  const { module_ } = queue;

  registerBindable(host, sep, queue);

  for (const element of elements) {
    if (excludes.some((E) => element instanceof E)) continue;
    if (element instanceof HTMLLinkElement) {
      const as = element.getAttribute("as") as LinkAs;
      switch (as) {
        case "script":
          (module_.scripts_ ??= []).push(element.href);
          break;
        case "style":
          (module_.styles_ ??= []).push(element.href);
          break;
      }
    }

    registerBindable(element, sep, queue);
  }
};

export interface Attributes {
  props_?: Attr[];
  events_?: Attr[];
}

function registerBindable(host: Element, sep: string, queue: Queue) {
  if (host.hasAttribute(sep)) {
    for (const attr of host.attributes) {
      if (attr.name !== sep && attr.name.endsWith(":")) {
        queue.flags_ |= Flags.hasBinding;
        (queue.attrs_.props_ ??= []).push(attr);
      } else if (attr.name.startsWith("on:")) {
        queue.flags_ |= Flags.hasListener;
        (queue.attrs_.events_ ??= []).push(attr);
      }
    }
  }
}

/** @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as */
type LinkAs = "script" | "style";

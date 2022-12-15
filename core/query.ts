export const enum ListOf {
  modulePath,
  attrNodes,
}
export const enum ModulePath {
  scripts,
  styles,
}
export const enum Flags {
  hasBinding = 0b01,
  hasListener = 0b10,
}
export type Return = [
  modulePath: [scripts: string[], styles: string[]],
  attrNodes: Attribute[],
  flags: Flags,
];

/** Get bindable attribute nodes and url module paths
@param host - query scope
@param excludes - exclude element if it instance of Element
@param primaryAttribute - if specified, make query faster by looking at that attribute as primary key
@returns tuple of url modules (from <link as="script or style" href="...">) and {@link Attr} nodes
*/
export default (
  host: Element,
  excludes: typeof Element[],
  primaryAttribute = "::",
  flags: Flags = 0,
): Return => {
  const elements = host.getElementsByTagName("*");

  const module: Return[ListOf.modulePath] = [[], []],
    attrs: Return[ListOf.attrNodes] = [];

  flags |= registerBindable(host, primaryAttribute, attrs);

  for (const element of elements) {
    if (excludes.some((E) => element instanceof E)) continue;
    if (element instanceof HTMLLinkElement) {
      const as = element.getAttribute("as") as LinkAs,
        type = as === "script"
          ? ModulePath.scripts
          : as === "style"
          ? ModulePath.styles
          : null;
      if (type != null) module[type].push(element.href);
    }

    flags |= registerBindable(element, primaryAttribute, attrs);
  }

  return [module, attrs, flags];
};

/** start index for slicing attribute name into normal form */
export const enum ColonFor {
  None = 0,
  /** \<tag attribute:=""\> ->  attribute="" */
  Attr = -1,
  /** \<tag on:event=""\> -> addEventListener(event) */
  Event = 3,
}

export const enum Feature {
  accessor,
  listener,
}
import type * as accessor from "./accessor.ts";
import type * as listener from "./listener.ts";
export type Features = [
  accessor: [typeof accessor.override, typeof accessor.infer] | 0,
  listener: [typeof listener.queue, typeof listener.listen] | 0,
];

export const enum Bind {
  Accessor = Flags.hasBinding,
  Method = Flags.hasListener,
}

export interface Attribute extends Attr {
  _bind: Bind;
}

function registerBindable(
  host: Element,
  sep: string,
  attrs: Attribute[],
  flags: Flags = 0,
): Flags {
  if (host.hasAttribute(sep)) {
    for (
      const {
        name,
        _: bind = name !== sep &&
            name.endsWith(":")
          ? Bind.Accessor
          : name.startsWith("on:")
          ? Bind.Method
          : 0,
      } of host.attributes as Iterable<Attr & { _?: Bind }>
    ) {
      if (bind) {
        flags |= attrs[
          attrs.push(host.getAttributeNode(name) as Attribute) - 1
        ]._bind = bind;
      }
    }
  }
  return flags;
}

/** @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as */
type LinkAs =
  | "script"
  | "style";

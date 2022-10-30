export const enum EnumReturn {
  modulePath,
  attrNodes,
}
export const enum EnumModulePath {
  scripts,
  styles,
}
export type Return = [
  modulePath: [scripts: string[], styles: string[]],
  attrNodes: Attribute[],
];

/** Get bindable attribute nodes and url module paths
@param host - query scope
@param excludes - exclude element if it instance of Element
@param isFastMode - enable fast hydration based on {@link primaryAttribute}
@param primaryAttribute - if specified, make query faster by looking at that attribute as primary key
@returns tuple of url modules (from <link as="script or style" href="...">) and {@link Attr} nodes
*/
export default (
  host: Element,
  excludes: typeof Element[] = [Object.getPrototypeOf(host).constructor],
  isFastMode = host.hasAttribute("data-fast-hydration"),
  primaryAttribute = ":-",
): Return => {
  const elements = isFastMode
    ? host.querySelectorAll(
      `:scope>link,[${
        primaryAttribute.replaceAll(":", "\\:")
      }]:not(${host.tagName},${host.tagName} *)`,
    )
    : host.getElementsByTagName("*");

  const module: Return[EnumReturn.modulePath] = [[], []],
    attrs: Return[EnumReturn.attrNodes] = [];

  if (!isFastMode || (isFastMode && host.hasAttribute(primaryAttribute))) {
    registerBindable(attrs, host);
  }
  for (const element of elements) {
    if (excludes.some((E) => element instanceof E)) continue;
    if (element instanceof HTMLLinkElement) {
      const as = element.getAttribute("as") as LinkAs,
        type = as === "script"
          ? EnumModulePath.scripts
          : as === "style"
          ? EnumModulePath.styles
          : null;
      if (type != null) module[type].push(element.href);
    }
    registerBindable(attrs, element);
  }

  return [module, attrs];
};

/** start index for slicing attribute name into normal form */
export const enum Colon {
  None = 0,
  /** \<tag :attribute\> ->  attribute="" */
  Single = 1,
  /** \<tag on:event\> -> on:event="" */
  StartWith_on = 3,
}

export const enum Bind {
  Accessor = 1,
  Method,
}

export interface Attribute extends Attr {
  _bind: Bind;
}

function registerBindable(
  attrs: Attribute[],
  host: Element,
) {
  for (
    const {
      name,
      _: bind = name.startsWith(":")
        ? Bind.Accessor
        : name.startsWith("on:")
        ? Bind.Method
        : 0,
    } of host.attributes as Iterable<Attr & { _?: Bind }>
  ) {
    if (bind) {
      attrs[
        attrs.push(host.getAttributeNode(name) as Attribute) - 1
      ]._bind = bind;
    }
  }
}

/** @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as */
type LinkAs =
  | "script"
  | "style";

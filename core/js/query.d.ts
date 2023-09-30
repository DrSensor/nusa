import type * as constant from "./constant.js";

export type Queue = {
  module_: Module;
  attrs_: Attributes;
  flags_: constant.Flags;
};

// export type Attributes = Record<"props_" | "events_", Attr[] | undefined>;
export interface Attributes {
  props_?: Attr[];
  events_?: Attr[];
}

// export type Module = Record<"scripts_" | "styles_", string[] | undefined>;
export interface Module {
  scripts_?: string[];
  styles_?: string[];
}

/** @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/link#attr-as */
declare type LinkAs = "script" | "style";

////////////////////////////////////////////////////////////////////////////

/** Get bindable attribute nodes and url module paths
@param host - query scope
@param HostElement - exclude <custom-element>
@param queue - queue every query into an object
*/ export default function (
  host: Element,
  HostElement: CustomElementConstructor,
  queue: Queue,
): void;

/** Queue and register {@link Attr} and it's {@link Flags} */
declare function registerBindable(host: Element, queue: Queue): void;

import query, { type Attribute, type Flags } from "./query.ts";
import * as loadWhen from "./observer.ts";

export default class RenderScope extends HTMLElement {
  constructor() {
    const allScripts: string[] = [], allAttrs: Attribute[] = [];
    let featureFlags: Flags = 0;
    super();
    const shadow = this.attachShadow({
        mode: this.getAttribute("shadow-root") as ShadowRootMode ?? "closed",
      }),
      slot = document.createElement("slot"); // TODO: handle slot in this.children (i.e <render-scope><slot/></render-scope>) to avoid nested slot
    shadow.append(slot);

    slot.onslotchange = () => { // avoid glitch when html content is too big
      const [[scripts], attrs, flags] = query(this, [RenderScope]);
      allAttrs.push(...attrs);
      allScripts.push(...scripts);
      featureFlags |= flags;
      slot.after(...this.childNodes);

      if (
        this.isConnected &&
        (this.nextSibling || document.readyState === "interactive")
      ) {
        slot.onslotchange = null;
        slot.remove();
        loadWhen.inview(shadow, allScripts, allAttrs, featureFlags);
      }
    };
  }
}

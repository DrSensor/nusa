import query, { type Attribute } from "./query.ts";
import * as loadWhen from "./observer.ts";

export default class RenderScope extends HTMLElement {
  constructor() {
    const allScripts: string[] = [], allAttrs: Attribute[] = [];

    super();
    const shadow = this.attachShadow({
        mode: this.getAttribute("shadow-root") as ShadowRootMode ?? "closed",
      }),
      slot = document.createElement("slot"); // TODO: handle slot in this.children (i.e <render-scope><slot/></render-scope>) to avoid nested slot
    shadow.append(slot);

    slot.onslotchange = () => { // avoid glitch when html content is too big
      const [[scripts], attrs] = query(this, [RenderScope]);
      allAttrs.push(...attrs);
      allScripts.push(...scripts);
      slot.after(...this.childNodes);

      if (
        this.isConnected &&
        (this.nextSibling || document.readyState === "interactive")
      ) {
        slot.onslotchange = null;
        slot.remove();
        loadWhen.inview(this, shadow, allScripts, allAttrs);
      }
    };
  }
}

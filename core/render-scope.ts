import query, { type Queue } from "./query.ts";
import * as loadWhen from "./observer.ts";

export default class RenderScope extends HTMLElement {
  constructor() {
    super();

    const shadow = this.attachShadow({
        mode: this.getAttribute("shadow-root") as ShadowRootMode ?? "closed",
      }),
      slot = document.createElement("slot"); // TODO: handle slot in this.children (i.e <render-scope><slot/></render-scope>) to avoid nested slot
    shadow.append(slot);

    const queue: Queue = { module_: {}, attrs_: {}, flags_: 0 };
    slot.onslotchange = () => { // avoid glitch when html content is too big
      query(this, [RenderScope], queue);
      slot.after(...this.childNodes);

      if (
        this.isConnected &&
        (this.nextSibling || document.readyState === "interactive")
      ) {
        slot.onslotchange = null;
        slot.remove();
        loadWhen.inview(shadow, queue);
      }
    };
  }
}

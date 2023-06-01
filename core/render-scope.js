import query from "./query.js";
import * as loadWhen from "./observer.js";

export default class RenderScope extends HTMLElement {
  constructor() {
    super();

    const shadow = this.attachShadow({
        mode: /** @type ShadowRootMode */ (
          this.getAttribute("shadow-root") ?? "closed"
        ),
      }),
      slot = document.createElement("slot"); // TODO: handle slot in this.children (i.e <render-scope><slot/></render-scope>) to avoid nested slot
    shadow.adoptedStyleSheets = document.adoptedStyleSheets; // BUG(browser): doesn't work on firefox but working fine on chrome
    shadow.append(slot);

    /** @type import("./query.js").Queue */
    const queue = { module_: {}, attrs_: {}, flags_: 0 };
    slot.onslotchange = () => {
      // avoid glitch when html content is too big
      query(this, RenderScope, queue);
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

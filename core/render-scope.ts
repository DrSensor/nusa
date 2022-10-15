import query from "./query.ts";
import bind from "./bind/esm.ts";

export default class extends HTMLElement implements CustomElement {
  #shadow = this.attachShadow({
    mode: this.getAttribute("shadowroot") as ShadowRootMode ?? "closed",
  });

  constructor() {
    super();
    this.#shadow.innerHTML = "<slot/>";
  }

  connectedCallback() {
    if (!this.isConnected) return;
    const [[scripts], attrs] = query(this);
    scripts.forEach((script) => import(script).then(bind(attrs)));
    this.#shadow.replaceChildren(...this.children);
  }
}

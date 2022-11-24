import query from "./query.ts";
import bind from "./bind.ts";

export default class extends HTMLElement {
  #shadow = this.attachShadow({
    mode: this.getAttribute("shadow-root") as ShadowRootMode ?? "closed",
  });

  constructor() {
    super();
    this.#shadow.innerHTML = "<slot/>";
  }

  connectedCallback() {
    if (!this.isConnected) return;
    const [[scripts], attrs] = query(this);
    scripts.forEach((script) => import(script).then(bind(this.#shadow, attrs)));
    this.#shadow.replaceChildren(...this.children);
  }
}

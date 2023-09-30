interface HTMLCollectionOf<T extends Element> {
  [Symbol.iterator](): Iterator<T>;
}

interface NamedNodeMap {
  [Symbol.iterator](): Iterator<Attr>;
}

interface Element {
  setHTML(input: string, options: { sanitizer: Sanitizer }): void;
}

declare class Sanitizer {
  constructor(
    config?: Partial<
      Record<
        | `allow${"Elements" | "Attributes" | "Comments" | "CustomElements"}`
        | `drop${"Elements" | "Attributes"}`
        | "blockElements",
        string[]
      >
    >,
  );
  sanitize(input: Document | DocumentFragment): DocumentFragment;
  sanitizeFor(element: HTMLElement, input: string): HTMLElement;
}

interface NodeListOf<TNode extends Node> {
  [Symbol.iterator](): Iterator<TNode>;
}

import type { Attribute } from "./query.ts";
import bind from "./bind.ts";

const registry = new WeakMap<
  Element,
  [shadow: ShadowRoot, scripts: string[], attrs: Attribute[]]
>();

const viewport = new IntersectionObserver((entries) =>
  entries.forEach((scope) => {
    if (scope.isIntersecting) {
      const host = scope.target;
      const [shadow, scripts, attrs] = registry.get(host)!;
      scripts.forEach((script) => import(script).then(bind(shadow, attrs)));
      registry.delete(host);
      viewport.unobserve(host);
    }
  })
);

/** observe viewport intersection
@see https://web.dev/intersectionobserver-v2/
*/ export function inview(
  host: Element,
  shadow: ShadowRoot,
  scripts: string[],
  attrs: Attribute[],
) {
  const rect = host.getBoundingClientRect();
  if (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= innerHeight &&
    rect.right <= innerWidth
  ) { // is in viewport (sync)
    scripts.forEach((script) => import(script).then(bind(shadow, attrs)));
  } else {
    registry.set(host, [shadow, scripts, attrs]);
    viewport.observe(host); // async might reduce TTI when `rel=modulepreload`
  }
}

/** observe true visibility
@see https://web.dev/intersectionobserver-v2/
*/ export function visible(
  host: Element,
  shadow: ShadowRoot,
  scripts: string[],
  attrs: Attribute[],
) {}

import type { Instance } from "./types.ts";
import { ColonFor } from "./query.ts";
import * as task from "./task.ts";

/** @example
```html
<button :: on:click="increment">
  <span> ++ </span>
</button>
<button :: on:click="!decrement">
  <span> -- </span>
</button>
```
clicking <span> ++ </span> will increment()
but clicking <span> -- </span> doesn't decrement()
unless you click certain area of <button> not covered by <span> -- </span>
*/
const enum Handle {
  Normal,
  Holey,
}
const enum Token {
  Holey = "!",
}
const events = {} as Record<
  string,
  Map<Element, [normal: Set<string>, holey: Set<string>]> | null
>;

export function queue(attr: Attr) {
  const eventName = attr.name.slice(ColonFor.Event);
  const methodNames = attr.value.split(" ").reduce((final, item) => (
    final[item.startsWith(Token.Holey) ? Handle.Holey : Handle.Normal]
      .push(item), final
  ), [[], []] as [string[], string[]]);

  if (events[eventName]?.has(attr.ownerElement!)) {
    const [normals, holeys] = events[eventName]!.get(attr.ownerElement!)!;
    const [normal$, holey$] = methodNames;
    normal$.forEach((name) => normals.add(name));
    holey$.forEach((name) => holeys.add(name));
  } else {
    (events[eventName] ??= new Map()).set(
      attr.ownerElement!,
      methodNames.map((it) => new Set(it)) as [Set<string>, Set<string>],
    );
  }
}

export let currentEvent: Event;

export function handledBy(scope: ShadowRoot, script: Instance) {
  Object.entries(events).forEach(([event, targetMap]) => {
    const cancel = { _: () => {} };
    let holeyMap: Map<Element, Set<string>>;
    let hasHoley = false;
    targetMap!.forEach(([methods, holeys], element) => {
      if (methods.size && element.childElementCount) {
        element.addEventListener(
          event,
          (e) => handle(script, methods, e, cancel),
          { passive: true, capture: true },
        );
      }
      if (!element.childElementCount) {
        methods.forEach((method) => holeys.add(Token.Holey + method));
      }
      if (holeys.size || !element.childElementCount) {
        holeyMap ??= new Map();
        holeyMap.set(element, holeys);
        hasHoley = true;
      }
      // WARNING: all elements that doesn't have children Element will be treated as holey
      // BUG(bind ref): which make ref.append(element) NOT work as expected (i.e click-ing appended element doesn't trigger class method)
    });
    if (hasHoley) {
      scope.addEventListener(event, (e) => {
        const methods = holeyMap.get(e.target as Element);
        if (methods) handle(script, methods, e, cancel, Token.Holey);
      }, { passive: true, capture: true });
    }
    events[event] = null;
  });
}

function handle(
  script: Instance,
  methods: Set<string>,
  e: Event,
  cancel: { _(): void },
  token?: string,
) {
  e.stopImmediatePropagation();
  cancel._();
  const render = task.prepare(() => {
    currentEvent = e;
    methods.forEach((methodName) =>
      (script[
        token ? methodName.slice(token.length) : methodName
      ] as VoidFunction)()
    );
  });
  cancel._ = render()!;
}

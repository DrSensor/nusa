/* @jsx jsx */
/* @jsxFrag Fragment */
import { Fragment, jsx, memo } from "hono/jsx";
import { html, raw, raw as js } from "hono/html";
const json = (object) => raw(JSON.stringify(object));

const importmap = {
  imports: {
    "libnusa/current": "/libs/javascript/current.js",
    "libnusa/iterate": "/libs/javascript/iterate.js",
    "nusa/render-scope": "/elements/render-scope.js",
  },
};

export default (
  <>
    <script type="importmap">{json(importmap)}</script>
    <script async>{js`import("nusa/render-scope")`}</script>

    {Array.from({ length: 10 }, (_, index) => (
      <>
        <Counter count={index} />
        <br />
      </>
    ))}
  </>
);

function Counter({ count }) {
  const hoistmap = memo(() => json(Counter.hoistmap));
  return html`
  <render-scope>
    <link as=script href=module.js>

    <!---------- optional ---------->
    <script type=hoistmap>${hoistmap()}</script>
    <!------------------------------>

    <button :: on:click=increment${count % 2 ? " text:=count" : ""}>
      ${count % 2 ? count : html`<span :: text:=count>${count}</span>`}
    </button>
    <input inputmode=numeric type=number :: value:=count on:change=set>
  </render-scope>
  `;
}
Counter.hoistmap = {
  imports: ["../counter/module.js", "libnusa/iterate", "libnusa/current"],
};

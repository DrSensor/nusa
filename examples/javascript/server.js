import { Hono } from "hono";
import { serveStatic } from "hono/serve-static";

const app = new Hono();
export default app;

app ///////////////////// importmap /////////////////////////
  .get("/elements/*", serveStatic({ root: "../../" }))
  .get("/libs/javascript/*", serveStatic({ root: "../../" }))
  .get("/core/*", serveStatic({ root: "../../" }));
/***********************************************************/
///////////////////// all examples/**/*.jsx /////////////////////
import multiCounter from "./multi-counter/index.jsx";
app.get("/multi-counter/index.html", (c) => c.html(multiCounter));
/***************************************************************/
app.get("/*", serveStatic({ root: "./" })); // all examples/**/*.html

export { iterate } from "../core/iterate.ts";

import { currentEvent } from "../core/registry.ts";
export const get = {
  get event() {
    return currentEvent;
  },
};

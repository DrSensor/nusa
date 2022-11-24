export { iterate } from "../core/iterate.ts";

import { currentEvent } from "../core/listener.ts";
export const get = {
  get event() {
    return currentEvent;
  },
};

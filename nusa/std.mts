export * as iterate from "./std/iterate.mts";

import { currentEvent } from "../core/registry.ts";
export const get = {
  get event() {
    return currentEvent;
  },
};

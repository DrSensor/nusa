import * as current from "libnusa/current";

export default class {
  count = 0;

  increment() {
    this.count++;
  }

  set() {
    this.count = +current.event.target.value;
  }
}

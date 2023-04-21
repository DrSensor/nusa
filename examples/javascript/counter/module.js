import * as current from "nusa/std/current";

export default class {
  accessor count = 0;

  increment() {
    this.count++;
  }

  set() {
    this.count = +current.event.target.value;
  }
}

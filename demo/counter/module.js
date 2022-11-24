import { get } from "/nusa/std.js"

export default class {
  accessor count = 0

  increment() { this.count++ }

  set() {
    this.count = +get.event.target.value
  }
}
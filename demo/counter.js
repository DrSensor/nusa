export default class {
  #count = 0
  set count(value) { this.#count = value }

  increment() { this.count = this.#count + 1 }

  set(value) {
    this.count =
      value instanceof Event
        ? +value.target.value
        : value
  }
}
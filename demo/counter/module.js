export default class {
  accessor count = 0

  increment() { this.count++ }

  set(value) {
    this.count =
      value instanceof Event
        ? +value.target.value
        : value
  }
}
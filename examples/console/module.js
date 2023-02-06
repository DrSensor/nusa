import * as current from "nusa/std/current"

export default class {
  log() { console.log(current.event) }
  debug() { console.debug(current.event) }
  info() { console.info(current.event) }
  warn() { console.warn(current.event) }
  error() { console.error(current.event) }
}
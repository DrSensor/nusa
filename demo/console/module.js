import { get } from "/nusa/std.js"

export default class {
  log() { console.log(get.event) }
  debug() { console.debug(get.event) }
  info() { console.info(get.event) }
  warn() { console.warn(get.event) }
  error() { console.error(get.event) }
}
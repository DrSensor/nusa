import Counter from "../counter/module.js"
import * as iterate from "/nusa/std/iterate.js"

setInterval(() => {
  iterate.for(Counter, (index, { count }) => {
    if (!(count[index] % 5)) { iterate.skip(); return }
    count[index]++
  })
}, 1e3)

export { default } from "../counter/module.js"

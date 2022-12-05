import Counter from "../counter/module.js"
import { iterate } from "/nusa/std.js"

setInterval(() => {
  iterate(Counter, (index, { count }) => {
    if (!(count[index] % 5)) return iterate.skip
    count[index]++
  })
}, 1e3)

export { default } from "../counter/module.js"

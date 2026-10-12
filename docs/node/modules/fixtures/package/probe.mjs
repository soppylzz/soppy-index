import { value } from "node-lesson-package"
import { value as internalValue } from "#value"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
let rejection
try {
  await import("node-lesson-package/private.mjs")
} catch (error) {
  rejection = error.code
}
console.log(
  JSON.stringify({
    value,
    internalValue,
    required: require("node-lesson-package").value,
    rejection,
  })
)

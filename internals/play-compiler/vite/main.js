/* global document */
import { greet } from "./greeting.mini.ts"
const message = greet("world")
console.log(message)
document.querySelector("#result").textContent = message

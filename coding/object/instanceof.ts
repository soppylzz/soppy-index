/** Models ordinary prototype-chain checks; excludes Symbol.hasInstance customization. */
export function instanceOf(value: unknown, constructor: object): boolean {
  if (typeof constructor !== "function") throw new TypeError("Right operand must be callable")
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return false
  const prototype: unknown = constructor.prototype
  if (prototype === null || (typeof prototype !== "object" && typeof prototype !== "function")) {
    throw new TypeError("Constructor prototype must be an object")
  }
  let current: object | null = Object.getPrototypeOf(value)
  while (current !== null) {
    if (current === prototype) return true
    current = Object.getPrototypeOf(current)
  }
  return false
}

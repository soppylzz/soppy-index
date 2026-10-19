/** Models new for ordinary function constructors, not classes or bound functions. */
export function newObject<T extends object, Args extends unknown[]>(
  constructor: new (...args: Args) => T,
  ...args: Args
): T {
  if (typeof constructor !== "function" || !Object.hasOwn(constructor, "prototype")) {
    throw new TypeError("Expected an ordinary function constructor")
  }
  const prototype: unknown = constructor.prototype
  const instance = Object.create(
    prototype !== null && (typeof prototype === "object" || typeof prototype === "function")
      ? prototype
      : Object.prototype
  ) as T
  const returned: unknown = Reflect.apply(constructor, instance, args)
  return returned !== null && (typeof returned === "object" || typeof returned === "function")
    ? (returned as T)
    : instance
}

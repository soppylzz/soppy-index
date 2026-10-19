export function bind<This, Args extends unknown[], Result>(
  fn: (this: This, ...args: Args) => Result,
  context: This,
  ...preset: unknown[]
) {
  if (typeof fn !== "function") throw new TypeError("Target must be callable")
  function bound(this: unknown, ...later: unknown[]): Result {
    const args = [...preset, ...later]
    if (new.target) {
      // Construction ignores the bound receiver and supports class constructors.
      return Reflect.construct(fn, args, new.target === bound ? fn : new.target) as Result
    }
    return fn.apply(context, args as Args)
  }
  if (typeof fn.prototype === "object" && fn.prototype !== null) {
    bound.prototype = fn.prototype
  }
  return bound
}

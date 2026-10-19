/** Teaching version: boxes receivers and requires an extensible receiver. */
export function call<This, Args extends unknown[], Result>(
  fn: (this: This, ...args: Args) => Result,
  context: This,
  ...args: Args
): Result {
  if (typeof fn !== "function") throw new TypeError("Target must be callable")
  const receiver = Object(context ?? globalThis) as This & Record<symbol, typeof fn>
  const key = Symbol("call target")
  Object.defineProperty(receiver, key, { value: fn, configurable: true })
  try {
    return receiver[key](...args)
  } finally {
    delete receiver[key]
  }
}

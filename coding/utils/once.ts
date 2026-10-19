export function once<This, Args extends unknown[], Result>(
  fn: (this: This, ...args: Args) => Result
) {
  let called = false
  let result: Result
  return function (this: This, ...args: Args): Result {
    if (!called) {
      // A synchronous exception does not consume the successful invocation.
      result = fn.apply(this, args)
      called = true
    }
    return result
  }
}

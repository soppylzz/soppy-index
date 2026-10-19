export interface Curried<Result> {
  (...args: unknown[]): Result | Curried<Result>
}

export function curry<This, Args extends unknown[], Result>(
  fn: (this: This, ...args: Args) => Result,
  arity = fn.length
): Curried<Result> {
  if (!Number.isInteger(arity) || arity < 0) throw new RangeError("Invalid arity")
  const collect = (previous: unknown[]): Curried<Result> =>
    function (this: This, ...args: unknown[]) {
      const collected = [...previous, ...args]
      // The final invocation supplies this; pass arity for default/rest parameters.
      if (collected.length >= arity) return fn.apply(this, collected as Args)
      return collect(collected)
    }
  return collect([])
}

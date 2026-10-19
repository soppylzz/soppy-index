import { call } from "./call.ts"

export function apply<This, Args extends unknown[], Result>(
  fn: (this: This, ...args: Args) => Result,
  context: This,
  args?: Args | null
): Result {
  return call(fn, context, ...((args ?? []) as Args))
}

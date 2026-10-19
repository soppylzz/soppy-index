import type { MyPromise } from "./promise.ts"

export function promiseCatch<T, TResult = never>(
  this: MyPromise<T>,
  onRejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null
): MyPromise<T | TResult> {
  return this.then(undefined, onRejected)
}

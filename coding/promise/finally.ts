import type { MyPromise } from "./promise.ts"
import { promiseResolve } from "./resolve.ts"

export function promiseFinally<T>(
  this: MyPromise<T>,
  onFinally?: (() => unknown) | null
): MyPromise<T> {
  if (typeof onFinally !== "function") return this.then()

  return this.then(
    (value) => promiseResolve(onFinally()).then(() => value),
    (reason) =>
      promiseResolve(onFinally()).then(() => {
        throw reason
      })
  )
}

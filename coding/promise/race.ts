import { MyPromise } from "./promise.ts"
import { promiseResolve } from "./resolve.ts"

export function promiseRace<T>(values: Iterable<T>): MyPromise<Awaited<T>> {
  return new MyPromise<Awaited<T>>((resolve, reject) => {
    for (const value of values) {
      promiseResolve(value).then(resolve, reject)
    }
    // Empty input leaves the executor without a settlement notification.
  })
}

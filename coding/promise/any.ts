import { MyPromise } from "./promise.ts"
import { promiseResolve } from "./resolve.ts"

export function promiseAny<T>(values: Iterable<T>): MyPromise<Awaited<T>> {
  return new MyPromise<Awaited<T>>((resolve, reject) => {
    const errors: unknown[] = []
    let index = 0
    let remaining = 1

    for (const value of values) {
      const currentIndex = index++
      remaining += 1

      promiseResolve(value).then(resolve, (reason: unknown) => {
        errors[currentIndex] = reason
        remaining -= 1
        if (remaining === 0) {
          reject(new AggregateError(errors, "All promises were rejected"))
        }
      })
    }

    remaining -= 1
    if (remaining === 0) {
      reject(new AggregateError(errors, "All promises were rejected"))
    }
  })
}

import { MyPromise } from "./promise.ts"
import { promiseResolve } from "./resolve.ts"

export function promiseAll<T>(values: Iterable<T>): MyPromise<Awaited<T>[]> {
  return new MyPromise<Awaited<T>[]>((resolve, reject) => {
    const results: Awaited<T>[] = []
    let index = 0
    // The extra count represents iteration itself and handles empty input.
    let remaining = 1

    for (const value of values) {
      const currentIndex = index++
      remaining += 1

      promiseResolve(value).then((result) => {
        results[currentIndex] = result
        remaining -= 1
        if (remaining === 0) resolve(results)
      }, reject)
    }

    remaining -= 1
    if (remaining === 0) resolve(results)
  })
}

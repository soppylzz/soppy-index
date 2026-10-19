import { MyPromise } from "./promise.ts"
import { promiseResolve } from "./resolve.ts"

export function promiseAllSettled<T>(
  values: Iterable<T>
): MyPromise<PromiseSettledResult<Awaited<T>>[]> {
  return new MyPromise<PromiseSettledResult<Awaited<T>>[]>((resolve) => {
    const results: PromiseSettledResult<Awaited<T>>[] = []
    let index = 0
    let remaining = 1

    const record = (index: number, result: PromiseSettledResult<Awaited<T>>) => {
      results[index] = result
      remaining -= 1
      if (remaining === 0) resolve(results)
    }

    for (const value of values) {
      const currentIndex = index++
      remaining += 1

      promiseResolve(value).then(
        (value) => record(currentIndex, { status: "fulfilled", value }),
        (reason: unknown) => record(currentIndex, { status: "rejected", reason })
      )
    }

    remaining -= 1
    if (remaining === 0) resolve(results)
  })
}

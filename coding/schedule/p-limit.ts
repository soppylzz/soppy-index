export interface Limit {
  <Args extends unknown[], Result>(
    task: (...args: Args) => Result,
    ...args: Args
  ): Promise<Awaited<Result>>
  readonly activeCount: number
  readonly pendingCount: number
  clearQueue(reason?: unknown): void
}

export function pLimit(concurrency: number): Limit {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError("Concurrency must be a positive integer")
  }

  const queue: Array<{ start: () => void; reject: (reason: unknown) => void }> = []
  let activeCount = 0

  const drain = () => {
    while (activeCount < concurrency && queue.length > 0) {
      const entry = queue.shift()!
      activeCount += 1
      entry.start()
    }
  }

  const limit = <Args extends unknown[], Result>(
    task: (...args: Args) => Result,
    ...args: Args
  ): Promise<Awaited<Result>> =>
    new Promise<Awaited<Result>>((resolve, reject) => {
      const finish = () => {
        activeCount -= 1
        drain()
      }
      queue.push({
        reject,
        start: () => {
          // Defer invocation so synchronous throws follow the rejection path too.
          Promise.resolve()
            .then(async (): Promise<Awaited<Result>> => await task(...args))
            .then(
              (value) => {
                finish()
                resolve(value)
              },
              (error: unknown) => {
                finish()
                reject(error)
              }
            )
        },
      })
      drain()
    })

  return Object.defineProperties(limit, {
    activeCount: { get: () => activeCount },
    pendingCount: { get: () => queue.length },
    clearQueue: {
      value: (reason: unknown = new Error("Queue cleared")) => {
        // Reject discarded submissions so callers never wait on abandoned promises.
        const discarded = queue.splice(0)
        for (const entry of discarded) entry.reject(reason)
      },
    },
  }) as Limit
}

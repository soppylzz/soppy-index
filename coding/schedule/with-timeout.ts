export class TimeoutError extends Error {
  override name = "TimeoutError"
}

export async function withTimeout<Result>(
  task: (signal: AbortSignal) => Result,
  ms: number
): Promise<Awaited<Result>> {
  if (!Number.isFinite(ms) || ms < 0 || ms > 2_147_483_647) {
    throw new RangeError("Timeout must be between 0 and 2147483647 milliseconds")
  }
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const error = new TimeoutError(`Task timed out after ${ms} milliseconds`)
      // Settle the deadline before abort listeners can settle the task.
      reject(error)
      controller.abort(error)
    }, ms)
  })

  try {
    const result = Promise.resolve().then(() => task(controller.signal))
    return await Promise.race([result, timeout])
  } finally {
    clearTimeout(timer)
  }
}

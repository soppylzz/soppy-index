import { sleep } from "./sleep.ts"

export interface PollOptions {
  interval?: number
  maxAttempts?: number
  signal?: AbortSignal
}

export async function poll<Result>(
  task: (attempt: number) => Result,
  isDone: (value: Awaited<Result>, attempt: number) => boolean | PromiseLike<boolean>,
  { interval = 1000, maxAttempts = 10, signal }: PollOptions = {}
): Promise<Awaited<Result>> {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {
    throw new RangeError("Max attempts must be a positive integer")
  }
  if (!Number.isFinite(interval) || interval < 0 || interval > 2_147_483_647) {
    throw new RangeError("Interval must be between 0 and 2147483647 milliseconds")
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    signal?.throwIfAborted()
    const value = await task(attempt)
    signal?.throwIfAborted()
    const done = await isDone(value, attempt)
    signal?.throwIfAborted()
    if (done) return value
    if (attempt < maxAttempts) await sleep(interval, signal)
  }
  throw new Error("Polling exceeded the maximum number of attempts")
}

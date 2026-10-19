export interface RetryOptions {
  retries?: number
  delay?: number
  shouldRetry?: (error: unknown, attempt: number) => boolean
}

export async function retry<Result>(
  task: (attempt: number) => Result | PromiseLike<Result>,
  { retries = 3, delay = 0, shouldRetry = () => true }: RetryOptions = {}
): Promise<Awaited<Result>> {
  if (!Number.isInteger(retries) || retries < 0) throw new RangeError("Invalid retries")
  if (!Number.isFinite(delay) || delay < 0) throw new RangeError("Invalid delay")
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await task(attempt)
    } catch (error) {
      if (attempt > retries || !shouldRetry(error, attempt)) throw error
      if (delay > 0) await new Promise<void>((resolve) => setTimeout(resolve, delay))
    }
  }
}

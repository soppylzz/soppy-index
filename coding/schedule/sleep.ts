export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!Number.isFinite(ms) || ms < 0 || ms > 2_147_483_647) {
      throw new RangeError("Delay must be between 0 and 2147483647 milliseconds")
    }
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }

    const onAbort = () => {
      clearTimeout(timer)
      signal?.removeEventListener("abort", onAbort)
      reject(signal?.reason)
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    signal?.addEventListener("abort", onAbort, { once: true })
  })
}

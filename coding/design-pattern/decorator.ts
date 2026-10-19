export type RequestLog =
  { phase: "start" } | { phase: "success" } | { phase: "error"; error: unknown }

export function withRequestLog<This, Args extends unknown[], Value>(
  request: (this: This, ...args: Args) => Value | PromiseLike<Value>,
  log: (entry: RequestLog) => void
) {
  return async function (this: This, ...args: Args): Promise<Awaited<Value>> {
    log({ phase: "start" })
    try {
      const value = await request.apply(this, args)
      log({ phase: "success" })
      return value
    } catch (error) {
      log({ phase: "error", error })
      throw error
    }
  }
}

export interface ThrottleOptions {
  leading?: boolean
  trailing?: boolean
}

export function throttle<This, Args extends unknown[], Result>(
  fn: (this: This, ...args: Args) => Result,
  wait: number,
  { leading = true, trailing = true }: ThrottleOptions = {}
) {
  if (!Number.isFinite(wait) || wait < 0) throw new RangeError("Invalid wait")
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: { context: This; args: Args } | undefined
  let result: Result | undefined

  const invoke = () => {
    const current = pending!
    pending = undefined
    result = fn.apply(current.context, current.args)
  }

  const expire = () => {
    if (trailing && pending) {
      // A trailing invocation starts the next cooldown window.
      timer = setTimeout(expire, wait)
      invoke()
    } else {
      timer = undefined
      pending = undefined
    }
  }

  function throttled(this: This, ...args: Args) {
    if (!leading && !trailing) return result
    pending = { context: this, args }
    if (timer === undefined) {
      timer = setTimeout(expire, wait)
      if (leading) invoke()
    }
    return result
  }

  throttled.cancel = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    pending = undefined
  }
  return throttled
}

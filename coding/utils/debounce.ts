export interface DebounceOptions {
  leading?: boolean
  trailing?: boolean
}

export function debounce<This, Args extends unknown[], Result>(
  fn: (this: This, ...args: Args) => Result,
  wait: number,
  { leading = false, trailing = true }: DebounceOptions = {}
) {
  if (!Number.isFinite(wait) || wait < 0) throw new RangeError("Invalid wait")
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: { context: This; args: Args } | undefined
  let result: Result | undefined

  const invoke = () => {
    const current = pending!
    pending = undefined
    result = fn.apply(current.context, current.args)
    return result
  }

  const expire = () => {
    timer = undefined
    if (trailing && pending) invoke()
    else {
      pending = undefined
    }
  }

  function debounced(this: This, ...args: Args) {
    const invokeLeading = timer === undefined && leading
    pending = { context: this, args }
    if (timer !== undefined) clearTimeout(timer)
    timer = setTimeout(expire, wait)
    if (invokeLeading) invoke()
    return result
  }

  debounced.cancel = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    pending = undefined
  }
  debounced.flush = () => {
    if (timer !== undefined) {
      clearTimeout(timer)
      expire()
    }
    return result
  }
  return debounced
}

export function createSingleton<Args extends unknown[], Value>(factory: (...args: Args) => Value) {
  let initialized = false
  let initializing = false
  let instance: Value

  return (...args: Args): Value => {
    if (initialized) return instance
    if (initializing) throw new Error("Recursive singleton initialization")
    initializing = true
    try {
      instance = factory(...args)
      initialized = true
      return instance
    } finally {
      // A failed factory can be retried; a successful undefined is still cached.
      initializing = false
    }
  }
}

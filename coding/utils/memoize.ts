interface CacheNode<T> {
  children: Map<unknown, CacheNode<T>>
  hasValue: boolean
  value?: T
}

export function memoize<This, Args extends unknown[], Result>(
  fn: (this: This, ...args: Args) => Result,
  resolver?: (this: This, ...args: Args) => unknown
) {
  const createNode = (): CacheNode<Result> => ({ children: new Map(), hasValue: false })
  let root = createNode()

  function memoized(this: This, ...args: Args): Result {
    // The default key includes receiver identity and every argument.
    const keys = resolver ? [resolver.apply(this, args)] : [this, ...args]
    let node = root
    for (const key of keys) {
      let child = node.children.get(key)
      if (!child) {
        child = createNode()
        node.children.set(key, child)
      }
      node = child
    }
    if (node.hasValue) return node.value as Result
    const value = fn.apply(this, args)
    node.value = value
    node.hasValue = true
    return value
  }
  memoized.clear = () => {
    root = createNode()
  }
  return memoized
}

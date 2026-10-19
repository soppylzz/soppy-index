export function deepClone<T>(value: T, seen = new WeakMap<object, object>()): T {
  if (value === null || typeof value !== "object") return value
  const cached = seen.get(value)
  if (cached) return cached as T

  let clone: object
  if (Array.isArray(value)) clone = new Array(value.length)
  else if (value instanceof Date) clone = new Date(value.getTime())
  else if (value instanceof RegExp) clone = new RegExp(value.source, value.flags)
  else if (value instanceof Map) clone = new Map()
  else if (value instanceof Set) clone = new Set()
  else {
    const prototype: unknown = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("Unsupported clone type")
    }
    clone = Object.create(prototype)
  }

  // Register before descending to preserve cycles and shared references.
  seen.set(value, clone)
  if (value instanceof Map) {
    for (const [key, entry] of value) {
      ;(clone as Map<unknown, unknown>).set(deepClone(key, seen), deepClone(entry, seen))
    }
  } else if (value instanceof Set) {
    for (const entry of value) (clone as Set<unknown>).add(deepClone(entry, seen))
  }

  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)!
    // Copy accessors without invoking them; functions keep their identity.
    if ("value" in descriptor) descriptor.value = deepClone(descriptor.value, seen)
    Object.defineProperty(clone, key, descriptor)
  }
  return clone as T
}

import { trackDep, triggerEffects, type Dep, type ReactiveEffect } from "./effect.ts"

const targets = new WeakMap<object, Map<PropertyKey, Dep>>()
const proxies = new WeakMap<object, object>()
const originals = new WeakMap<object, object>()
const iterateKey = Symbol("iterate")

function track(target: object, key: PropertyKey) {
  let deps = targets.get(target)
  if (!deps) targets.set(target, (deps = new Map()))
  let dep = deps.get(key)
  if (!dep) deps.set(key, (dep = new Set()))
  trackDep(dep)
}

function trigger(target: object, key: PropertyKey, structural: boolean, oldLength: number) {
  const deps = targets.get(target)
  if (!deps) return
  const effects = new Set<ReactiveEffect>(deps.get(key))
  const add = (dep?: Dep) => dep?.forEach((effect) => effects.add(effect))
  if (structural) add(deps.get(iterateKey))
  if (Array.isArray(target)) {
    if (key === "length") {
      add(deps.get(iterateKey))
      for (const [depKey, dep] of deps) {
        if (isIndex(depKey) && Number(depKey) >= target.length) add(dep)
      }
    } else if (isIndex(key) && Number(key) >= oldLength) add(deps.get("length"))
  }
  triggerEffects(effects)
}

function isIndex(key: PropertyKey) {
  return typeof key === "string" && /^(0|[1-9]\d*)$/.test(key) && Number(key) < 2 ** 32 - 1
}

export function toRaw<T>(value: T): T {
  return (
    typeof value === "object" && value !== null ? (originals.get(value) ?? value) : value
  ) as T
}

export function toReactive<T>(value: T): T {
  if (typeof value !== "object" || value === null) return value
  const prototype = Object.getPrototypeOf(value)
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return value
  return reactive(value)
}

export function reactive<T extends object>(target: T): T {
  if (originals.has(target)) return target
  const cached = proxies.get(target)
  if (cached) return cached as T
  if (!Object.isExtensible(target)) throw new TypeError("Expected an extensible object")
  const prototype = Object.getPrototypeOf(target)
  if (!Array.isArray(target) && prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Only plain objects and arrays are supported")
  }
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      track(target, key)
      return toReactive(Reflect.get(target, key, receiver))
    },
    set(target, key, value, receiver) {
      const oldLength = Array.isArray(target) ? target.length : 0
      const had = Object.hasOwn(target, key)
      const previous = Reflect.get(target, key)
      const raw = toRaw(value)
      const result = Reflect.set(target, key, raw, receiver)
      if (result && target === toRaw(receiver) && (!had || !Object.is(previous, raw))) {
        trigger(target, key, !had, oldLength)
      }
      return result
    },
    deleteProperty(target, key) {
      const had = Object.hasOwn(target, key)
      const result = Reflect.deleteProperty(target, key)
      if (result && had) trigger(target, key, true, Array.isArray(target) ? target.length : 0)
      return result
    },
    has(target, key) {
      track(target, key)
      return Reflect.has(target, key)
    },
    ownKeys(target) {
      track(target, iterateKey)
      return Reflect.ownKeys(target)
    },
  })
  proxies.set(target, proxy)
  originals.set(proxy, target)
  return proxy
}

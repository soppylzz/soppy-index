import { trackDep, triggerEffects, type Dep } from "./effect.ts"
import { toRaw, toReactive } from "./reactive.ts"

export interface Ref<T> {
  value: T
}

export function ref<T>(initial: T): Ref<T> {
  const dep: Dep = new Set()
  let raw = toRaw(initial)
  let value = toReactive(initial)
  return {
    get value() {
      trackDep(dep)
      return value
    },
    set value(next: T) {
      const nextRaw = toRaw(next)
      if (Object.is(raw, nextRaw)) return
      raw = nextRaw
      value = toReactive(next)
      triggerEffects(dep)
    },
  }
}

export function toRef<T extends object, K extends keyof T>(object: T, key: K): Ref<T[K]> {
  return {
    get value() {
      return object[key]
    },
    set value(value: T[K]) {
      object[key] = value
    },
  }
}

export function toRefs<T extends object>(object: T): { [K in keyof T]: Ref<T[K]> } {
  const result = {} as { [K in keyof T]: Ref<T[K]> }
  for (const key of Object.keys(object) as (keyof T)[]) result[key] = toRef(object, key)
  return result
}

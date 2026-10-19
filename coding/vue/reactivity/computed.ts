import { ReactiveEffect, trackDep, triggerEffects, type Dep } from "./effect.ts"

export function computed<T>(getter: () => T): { readonly value: T } {
  const dep: Dep = new Set()
  let dirty = true
  let cached: T
  const runner = new ReactiveEffect(getter, () => {
    if (!dirty) {
      dirty = true
      triggerEffects(dep)
    }
  })
  runner.computed = true
  return {
    get value() {
      trackDep(dep)
      if (dirty) {
        cached = runner.run() as T
        dirty = false
      }
      return cached
    },
  }
}

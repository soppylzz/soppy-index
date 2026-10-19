import { describe, expect, it, vi } from "vitest"
import {
  computed,
  effect,
  nextTick,
  reactive,
  ref,
  stop,
  toRaw,
  toRefs,
  watch,
  watchEffect,
} from "../reactivity/index.ts"

describe("handwritten reactivity", () => {
  it("caches proxies and deeply tracks objects", () => {
    const raw = { nested: { count: 0 } }
    const state = reactive(raw)
    expect(reactive(raw)).toBe(state)
    expect(reactive(state)).toBe(state)
    expect(toRaw(state)).toBe(raw)
    const read = vi.fn(() => state.nested.count)
    effect(read)
    state.nested.count++
    expect(read).toHaveLastReturnedWith(1)
    state.nested = { count: 2 }
    expect(read).toHaveLastReturnedWith(2)
    state.nested.count = 2
    expect(read).toHaveBeenCalledTimes(3)
  })

  it("cleans abandoned branch dependencies and stops tracking", () => {
    const state = reactive({ left: true, a: 1, b: 2 })
    const read = vi.fn(() => (state.left ? state.a : state.b))
    const runner = effect(read)
    state.left = false
    state.a++
    expect(read).toHaveBeenCalledTimes(2)
    state.b++
    expect(read).toHaveLastReturnedWith(3)
    stop(runner)
    state.b++
    expect(read).toHaveBeenCalledTimes(3)
    runner()
    state.b++
    expect(read).toHaveBeenCalledTimes(4)
  })

  it("restores parent collection after nested effects and thrown getters", () => {
    const state = reactive({ a: 1, b: 1 })
    const inner = effect(() => state.a)
    const outer = vi.fn(() => {
      inner()
      return state.b
    })
    effect(outer)
    state.b++
    expect(outer).toHaveBeenCalledTimes(2)
    expect(() =>
      effect(() => {
        throw new Error("broken getter")
      })
    ).toThrow("broken getter")
    const read = vi.fn(() => state.b)
    effect(read)
    state.b++
    expect(read).toHaveBeenCalledTimes(2)
  })

  it("tracks membership, enumeration and deletion", () => {
    const state = reactive<Record<string, number>>({ a: 1 })
    const keys = vi.fn(() => Object.keys(state))
    const has = vi.fn(() => "b" in state)
    effect(keys)
    effect(has)
    state.b = 2
    expect(keys).toHaveLastReturnedWith(["a", "b"])
    expect(has).toHaveLastReturnedWith(true)
    delete state.b
    expect(keys).toHaveLastReturnedWith(["a"])
    expect(has).toHaveLastReturnedWith(false)
  })

  it("invalidates array indexes and length without changing length on deletion", () => {
    const list = reactive([1, 2])
    const length = vi.fn(() => list.length)
    const index = vi.fn(() => list[1])
    effect(length)
    effect(index)
    list.push(3)
    expect(length).toHaveLastReturnedWith(3)
    Reflect.deleteProperty(list, "2")
    expect(length).toHaveBeenCalledTimes(2)
    list.length = 1
    expect(index).toHaveLastReturnedWith(undefined)
  })

  it("preserves deep ref tracking and toRefs links", () => {
    const value = ref({ count: 1 })
    const read = vi.fn(() => value.value.count)
    effect(read)
    value.value.count++
    expect(read).toHaveLastReturnedWith(2)
    const sameObject = value.value
    value.value = sameObject
    expect(read).toHaveBeenCalledTimes(2)
    const state = reactive({ count: 1 })
    const { count } = toRefs(state)
    count.value = 3
    expect(state.count).toBe(3)
    state.count++
    expect(count.value).toBe(4)
  })

  it("computes lazily and invalidates before consumers run", () => {
    const state = reactive({ count: 1 })
    const getter = vi.fn(() => state.count * 2)
    const doubled = computed(getter)
    expect(getter).not.toHaveBeenCalled()
    const read = vi.fn(() => `${state.count}/${doubled.value}`)
    effect(read)
    expect(doubled.value).toBe(2)
    expect(getter).toHaveBeenCalledTimes(1)
    state.count = 2
    expect(read).toHaveLastReturnedWith("2/4")
    expect(read).toHaveBeenCalledTimes(2)
    expect(getter).toHaveBeenCalledTimes(2)
  })

  it("supports effect schedulers", () => {
    const state = ref(0)
    const read = vi.fn(() => state.value)
    const schedule = vi.fn()
    const runner = effect(read, { scheduler: schedule })
    state.value++
    expect(schedule).toHaveBeenCalledOnce()
    expect(read).toHaveBeenCalledOnce()
    runner()
    expect(read).toHaveLastReturnedWith(1)
  })

  it("batches watch jobs and cleans invalidated work", async () => {
    const count = ref(0)
    const cleanup = vi.fn()
    const callback = vi.fn((_next, _old, onCleanup) => onCleanup(cleanup))
    const dispose = watch(() => count.value, callback, { immediate: true })
    count.value = 1
    count.value = 2
    expect(callback).toHaveBeenCalledOnce()
    await nextTick()
    expect(callback).toHaveBeenCalledTimes(2)
    expect(callback.mock.calls[1].slice(0, 2)).toEqual([2, 0])
    expect(cleanup).toHaveBeenCalledOnce()
    count.value = 3
    dispose()
    await nextTick()
    expect(callback).toHaveBeenCalledTimes(2)
    expect(cleanup).toHaveBeenCalledTimes(2)
  })

  it("supports synchronous watchers and deep cyclic objects", () => {
    const raw: { count: number; self?: unknown } = { count: 0 }
    raw.self = raw
    const state = reactive(raw)
    const callback = vi.fn()
    const dispose = watch(() => state, callback, { deep: true, flush: "sync" })
    state.count++
    expect(callback).toHaveBeenCalledOnce()
    expect(callback.mock.calls[0][0]).toBe(callback.mock.calls[0][1])
    dispose()
  })

  it("cleans watchEffect on rerun and disposal", async () => {
    const count = ref(0)
    const cleanup = vi.fn()
    const read = vi.fn((onCleanup) => {
      onCleanup(cleanup)
      return count.value
    })
    const dispose = watchEffect(read)
    count.value++
    await nextTick()
    expect(read).toHaveLastReturnedWith(1)
    expect(cleanup).toHaveBeenCalledOnce()
    dispose()
    expect(cleanup).toHaveBeenCalledTimes(2)
  })
})

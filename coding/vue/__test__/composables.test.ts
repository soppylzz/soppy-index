import { effectScope, nextTick, ref, watchEffect } from "vue"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useDebouncedRef } from "../composables/useDebouncedRef.ts"
import { useInterval } from "../composables/useInterval.ts"
import { useEventListener } from "../composables/useEventListener.ts"
import { useLocalStorage } from "../composables/useLocalStorage.ts"
import { useRequest } from "../composables/useRequest.ts"

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe("Vue composable lifecycle", () => {
  it("debounces writes and cancels work on scope disposal", async () => {
    vi.useFakeTimers()
    const scope = effectScope()
    const value = scope.run(() => useDebouncedRef("a", 100))!
    const read = vi.fn(() => value.value)
    scope.run(() => watchEffect(read))
    value.value = "b"
    vi.advanceTimersByTime(50)
    value.value = "c"
    vi.advanceTimersByTime(99)
    expect(value.value).toBe("a")
    vi.advanceTimersByTime(1)
    await nextTick()
    expect(read).toHaveLastReturnedWith("c")
    value.value = "d"
    scope.stop()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("pauses and disposes a single interval", () => {
    vi.useFakeTimers()
    const scope = effectScope()
    const tick = vi.fn()
    const timer = scope.run(() => useInterval(tick, 100))!
    timer.resume()
    timer.resume()
    vi.advanceTimersByTime(200)
    expect(tick).toHaveBeenCalledTimes(2)
    timer.pause()
    vi.advanceTimersByTime(100)
    expect(tick).toHaveBeenCalledTimes(2)
    timer.resume()
    scope.stop()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("moves a listener between element refs and removes it on disposal", async () => {
    const scope = effectScope()
    const first = document.createElement("button")
    const second = document.createElement("button")
    const target = ref<HTMLElement | null>(first)
    const click = vi.fn()
    scope.run(() => useEventListener(target, "click", click))
    first.click()
    target.value = second
    await nextTick()
    first.click()
    second.click()
    expect(click).toHaveBeenCalledTimes(2)
    scope.stop()
    second.click()
    expect(click).toHaveBeenCalledTimes(2)
  })

  it("synchronizes storage between instances and handles external removal", () => {
    const scope = effectScope()
    const [a, b] = scope.run(() => [
      useLocalStorage("name", "Ada"),
      useLocalStorage("name", "Ada"),
    ])!
    a.value.value = "Grace"
    expect(b.value.value).toBe("Grace")
    localStorage.removeItem("name")
    window.dispatchEvent(new StorageEvent("storage", { key: "name", storageArea: localStorage }))
    expect(a.value.value).toBe("Ada")
    scope.stop()
    expect(localStorage.getItem("name")).toBeNull()
  })

  it("ignores stale request results and aborts on disposal", async () => {
    const scope = effectScope()
    const params = ref("old")
    const tasks: { signal: AbortSignal; resolve: (value: string) => void }[] = []
    const request = (_query: string, signal: AbortSignal) =>
      new Promise<string>((resolve) => tasks.push({ signal, resolve }))
    const result = scope.run(() => useRequest(params, request))!
    await Promise.resolve()
    params.value = "new"
    await Promise.resolve()
    expect(tasks[0].signal.aborted).toBe(true)
    tasks[1].resolve("new result")
    await vi.waitFor(() =>
      expect(result.state.value).toEqual({ status: "success", data: "new result" })
    )
    tasks[0].resolve("old result")
    await Promise.resolve()
    await Promise.resolve()
    expect(result.state.value).toEqual({ status: "success", data: "new result" })
    result.reload()
    await Promise.resolve()
    scope.stop()
    expect(tasks[2].signal.aborted).toBe(true)
  })

  it("exposes request rejection and can reload", async () => {
    const scope = effectScope()
    const request = vi.fn().mockRejectedValueOnce(new Error("failure")).mockResolvedValue("ok")
    const result = scope.run(() => useRequest(ref(0), request))!
    await vi.waitFor(() => expect(result.state.value.status).toBe("error"))
    result.reload()
    await vi.waitFor(() => expect(result.state.value).toEqual({ status: "success", data: "ok" }))
    scope.stop()
  })
})

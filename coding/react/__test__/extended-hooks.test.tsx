import { act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useToggle } from "../hooks/useToggle.ts"
import { useDebounce } from "../hooks/useDebounce.ts"
import { useThrottle } from "../hooks/useThrottle.ts"
import { useEventListener } from "../hooks/useEventListener.ts"
import { useClickOutside } from "../hooks/useClickOutside.ts"
import { useTimeout } from "../hooks/useTimeout.ts"
import { useWindowSize } from "../hooks/useWindowSize.ts"
import { useScroll } from "../hooks/useScroll.ts"
import { useIntersectionObserver } from "../hooks/useIntersectionObserver.ts"
import { usePreviousDistinct } from "../hooks/usePreviousDistinct.ts"
import { useLockFn } from "../hooks/useLockFn.ts"
import { useAsync } from "../hooks/useAsync.ts"
import { useFetch } from "../hooks/useFetch.ts"
import { useSessionStorage } from "../hooks/useSessionStorage.ts"

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const roots: Root[] = []
function mountHook<P, R>(hook: (props: P) => R, initial: P) {
  let result: R
  function Probe({ props }: { props: P }): ReactNode {
    result = hook(props)
    return null
  }
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  const render = (props: P) => act(() => root.render(<Probe props={props} />))
  render(initial)
  return { read: () => result, render, unmount: () => act(() => root.unmount()) }
}

afterEach(() => {
  act(() => {
    for (const root of roots.splice(0)) root.unmount()
  })
  document.body.replaceChildren()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  sessionStorage.clear()
  localStorage.clear()
})

describe("callback and lifecycle hooks", () => {
  it("toggles functionally and supports explicit false", () => {
    const hook = mountHook(() => useToggle(), undefined)
    act(() => {
      hook.read()[1]()
      hook.read()[1]()
    })
    expect(hook.read()[0]).toBe(false)
    act(() => hook.read()[1](true))
    expect(hook.read()[0]).toBe(true)
    act(() => hook.read()[1](false))
    expect(hook.read()[0]).toBe(false)
  })

  it("debounces latest arguments and callback, flushes and cancels on unmount", () => {
    vi.useFakeTimers()
    const first = vi.fn<(value: string) => void>()
    const latest = vi.fn<(value: string) => void>()
    const hook = mountHook((callback: typeof first) => useDebounce(callback, 100), first)
    act(() => {
      hook.read().run("a")
      hook.read().run("b")
    })
    hook.render(latest)
    act(() => vi.advanceTimersByTime(100))
    expect(first).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledWith("b")
    act(() => {
      hook.read().run("c")
      hook.read().flush()
    })
    expect(latest).toHaveBeenLastCalledWith("c")
    act(() => hook.read().run("d"))
    hook.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("throttles on leading and trailing edges with the last arguments", () => {
    vi.useFakeTimers()
    const callback = vi.fn<(value: number) => void>()
    const hook = mountHook(() => useThrottle(callback, 100), undefined)
    hook.read().run(1)
    hook.read().run(2)
    vi.advanceTimersByTime(50)
    hook.read().run(3)
    vi.advanceTimersByTime(50)
    expect(callback.mock.calls).toEqual([[1], [3]])
    hook.read().run(4)
    hook.read().cancel()
    vi.advanceTimersByTime(200)
    expect(callback).toHaveBeenCalledTimes(2)
    hook.read().run(5)
    expect(callback).toHaveBeenLastCalledWith(5)
  })

  it("keeps listeners current and detaches from the previous target", () => {
    const first = new EventTarget()
    const second = new EventTarget()
    const a = vi.fn()
    const b = vi.fn()
    const hook = mountHook(({ target, callback }) => useEventListener(target, "ping", callback), {
      target: first,
      callback: a,
    })
    first.dispatchEvent(new Event("ping"))
    hook.render({ target: first, callback: b })
    first.dispatchEvent(new Event("ping"))
    hook.render({ target: second, callback: b })
    first.dispatchEvent(new Event("ping"))
    second.dispatchEvent(new Event("ping"))
    expect(a).toHaveBeenCalledOnce()
    expect(b).toHaveBeenCalledTimes(2)
    hook.unmount()
    second.dispatchEvent(new Event("ping"))
    expect(b).toHaveBeenCalledTimes(2)
  })

  it("ignores inside pointer events and removes the outside listener", () => {
    const element = document.createElement("div")
    const child = document.createElement("button")
    element.append(child)
    document.body.append(element)
    const outside = vi.fn()
    const hook = mountHook(() => useClickOutside(element, outside), undefined)
    child.dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }))
    expect(outside).not.toHaveBeenCalled()
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }))
    expect(outside).toHaveBeenCalledOnce()
    hook.unmount()
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }))
    expect(outside).toHaveBeenCalledOnce()
  })

  it("runs a timeout with the latest callback and supports null", () => {
    vi.useFakeTimers()
    const first = vi.fn()
    const latest = vi.fn()
    const hook = mountHook(
      ({ callback, delay }: { callback: () => void; delay: number | null }) =>
        useTimeout(callback, delay),
      { callback: first, delay: 100 } as { callback: () => void; delay: number | null }
    )
    vi.advanceTimersByTime(50)
    hook.render({ callback: latest, delay: 100 })
    vi.advanceTimersByTime(50)
    expect(latest).toHaveBeenCalledOnce()
    expect(first).not.toHaveBeenCalled()
    hook.render({ callback: latest, delay: null })
    expect(vi.getTimerCount()).toBe(0)
  })

  it("tracks previous distinct values across unchanged commits", () => {
    const hook = mountHook<number, number | undefined>((value) => usePreviousDistinct(value), 1)
    hook.render(2)
    expect(hook.read()).toBe(1)
    hook.render(2)
    expect(hook.read()).toBe(1)
    hook.render(3)
    expect(hook.read()).toBe(2)
  })

  it("keeps session storage independent from local storage", () => {
    localStorage.setItem("note", '"local"')
    const hook = mountHook(() => useSessionStorage("note", "default"), undefined)
    act(() => hook.read()[1]("session"))
    expect(hook.read()[0]).toBe("session")
    expect(sessionStorage.getItem("note")).toBe('"session"')
    expect(localStorage.getItem("note")).toBe('"local"')
  })

  it("updates viewport size and resets scroll position when targets change", () => {
    const size = mountHook(() => useWindowSize(), undefined)
    vi.stubGlobal("innerWidth", 800)
    act(() => window.dispatchEvent(new Event("resize")))
    expect(size.read().width).toBe(800)
    const first = document.createElement("div")
    const second = document.createElement("div")
    const scroll = mountHook((target: HTMLElement) => useScroll(target), first)
    act(() => {
      first.scrollTop = 40
      first.dispatchEvent(new Event("scroll"))
    })
    expect(scroll.read().y).toBe(40)
    scroll.render(second)
    expect(scroll.read()).toEqual({ x: 0, y: 0 })
  })

  it("replaces observers and ignores queued notifications after cleanup", () => {
    const instances: {
      callback: IntersectionObserverCallback
      observe: ReturnType<typeof vi.fn>
      disconnect: ReturnType<typeof vi.fn>
    }[] = []
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = vi.fn()
        disconnect = vi.fn()
        callback: IntersectionObserverCallback
        constructor(callback: IntersectionObserverCallback) {
          this.callback = callback
          instances.push(this)
        }
      }
    )
    const first = document.createElement("div")
    const second = document.createElement("div")
    const hook = mountHook(
      (target: Element) => useIntersectionObserver(target, { threshold: [0, 0.5] }),
      first
    )
    const entry: IntersectionObserverEntry = {
      target: first,
      isIntersecting: true,
      boundingClientRect: new DOMRect(),
      intersectionRatio: 1,
      intersectionRect: new DOMRect(),
      rootBounds: null,
      time: 0,
    }
    act(() => instances[0].callback([entry], {} as IntersectionObserver))
    expect(hook.read().entry).toBe(entry)
    hook.render(second)
    expect(instances).toHaveLength(2)
    expect(instances[0].disconnect).toHaveBeenCalledOnce()
    act(() => instances[0].callback([entry], {} as IntersectionObserver))
    expect(hook.read().entry).toBeNull()
    hook.unmount()
    expect(instances[1].disconnect).toHaveBeenCalledOnce()
  })
})

describe("async hooks", () => {
  it("shares a locked promise and releases the lock after rejection", async () => {
    let reject!: (error: Error) => void
    const task = vi.fn(
      () =>
        new Promise<string>((_resolve, fail) => {
          reject = fail
        })
    )
    const hook = mountHook(() => useLockFn(task), undefined)
    const first = hook.read()()
    const second = hook.read()()
    expect(first).toBe(second)
    await Promise.resolve()
    expect(task).toHaveBeenCalledOnce()
    reject(new Error("failure"))
    await expect(first).rejects.toThrow("failure")
    const next = hook.read()()
    expect(next).not.toBe(first)
    await Promise.resolve()
    reject(new Error("again"))
    await expect(next).rejects.toThrow("again")
  })

  it("cancels superseded tasks and prevents writes after unmount", async () => {
    const tasks: { signal: AbortSignal; resolve: (value: string) => void }[] = []
    const task = (signal: AbortSignal) =>
      new Promise<string>((resolve) => tasks.push({ signal, resolve }))
    const hook = mountHook(() => useAsync(task), undefined)
    let first!: Promise<string | undefined>
    let second!: Promise<string | undefined>
    act(() => {
      first = hook.read().run()
      second = hook.read().run()
    })
    expect(tasks[0].signal.aborted).toBe(true)
    await act(async () => {
      tasks[1].resolve("new")
      await second
    })
    await act(async () => {
      tasks[0].resolve("old")
      await first
    })
    expect(hook.read().state).toEqual({ status: "success", data: "new" })
    act(() => {
      void hook.read().run()
    })
    hook.unmount()
    expect(tasks[2].signal.aborted).toBe(true)
    await act(async () => tasks[2].resolve("unmounted"))
  })

  it("exposes async errors and cancellation returns to idle", async () => {
    const hook = mountHook(
      () =>
        useAsync(async () => {
          throw new Error("failure")
        }),
      undefined
    )
    await act(async () => {
      await hook.read().run()
    })
    expect(hook.read().state.status).toBe("error")
    act(() => hook.read().cancel())
    expect(hook.read().state.status).toBe("idle")
  })

  it("rejects HTTP failures before decoding and handles decode errors", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, statusText: "Not Found" })
      .mockResolvedValue({ ok: true, json: async () => ({ invalid: true }) })
    vi.stubGlobal("fetch", fetch)
    const decode = vi.fn((): string[] => {
      throw new TypeError("Invalid topics")
    })
    const hook = mountHook(() => useFetch("/topics.json", decode), undefined)
    await act(async () => {})
    expect(hook.read().status).toBe("error")
    expect(decode).not.toHaveBeenCalled()
    await act(async () => hook.read().reload())
    const state = hook.read()
    expect(state.status === "error" && state.error.message).toBe("Invalid topics")
  })
})

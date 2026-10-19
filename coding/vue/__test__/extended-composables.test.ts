import {
  createApp,
  defineComponent,
  effectScope,
  h,
  nextTick,
  ref,
  withDirectives,
  type App,
  type EffectScope,
} from "vue"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useToggle } from "../composables/useToggle.ts"
import { useDebounce } from "../composables/useDebounce.ts"
import { useThrottle } from "../composables/useThrottle.ts"
import { useStorage } from "../composables/useStorage.ts"
import { useWindowSize } from "../composables/useWindowSize.ts"
import { useIntersectionObserver } from "../composables/useIntersectionObserver.ts"
import { useAsyncState } from "../composables/useAsyncState.ts"
import { useFetch } from "../composables/useFetch.ts"
import { vLazy } from "../directives/lazy.ts"
import { vClickOutside } from "../directives/clickOutside.ts"
import { ExtendedDemos } from "../demos/ExtendedDemos.ts"

const scopes: EffectScope[] = []
const apps: App[] = []
function scoped<T>(setup: () => T) {
  const scope = effectScope()
  scopes.push(scope)
  return { value: scope.run(setup)!, stop: () => scope.stop() }
}
function mount(render: () => ReturnType<typeof h>) {
  const container = document.createElement("div")
  document.body.append(container)
  const app = createApp(defineComponent({ setup: () => render }))
  apps.push(app)
  app.mount(container)
  return {
    container,
    unmount: () => {
      app.unmount()
      apps.splice(apps.indexOf(app), 1)
    },
  }
}
class ObserverDouble {
  static instances: ObserverDouble[] = []
  callback: IntersectionObserverCallback
  observe = vi.fn()
  disconnect = vi.fn()
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    ObserverDouble.instances.push(this)
  }
  emit(target: Element, isIntersecting = true) {
    const entry: IntersectionObserverEntry = {
      target,
      isIntersecting,
      intersectionRatio: Number(isIntersecting),
      boundingClientRect: new DOMRect(),
      intersectionRect: new DOMRect(),
      rootBounds: null,
      time: 0,
    }
    this.callback([entry], this as unknown as IntersectionObserver)
  }
}

afterEach(() => {
  for (const scope of scopes.splice(0)) scope.stop()
  for (const app of apps.splice(0)) app.unmount()
  document.body.replaceChildren()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  sessionStorage.clear()
  localStorage.clear()
  ObserverDouble.instances = []
})

describe("extended composables", () => {
  it("mounts the integrated demo and clears pending callbacks on unmount", async () => {
    vi.useFakeTimers()
    vi.stubGlobal("IntersectionObserver", ObserverDouble)
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ["Vue"] }))
    const view = mount(() => h(ExtendedDemos))
    await Promise.resolve()
    await Promise.resolve()
    await nextTick()
    const burst = [...view.container.querySelectorAll("button")].find(
      (button) => button.textContent === "Burst click"
    )!
    burst.click()
    await nextTick()
    expect(view.container.textContent).toContain("Clicks: 1")
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
    expect(
      ObserverDouble.instances.every((observer) => observer.disconnect.mock.calls.length > 0)
    ).toBe(true)
  })

  it("toggles or sets an explicit boolean", () => {
    const toggle = useToggle()
    toggle.toggle()
    expect(toggle.value.value).toBe(true)
    toggle.toggle(false)
    expect(toggle.value.value).toBe(false)
  })

  it("debounces with the latest arguments and supports flush and disposal", () => {
    vi.useFakeTimers()
    const callback = vi.fn<(value: string) => void>()
    const scope = scoped(() => useDebounce(callback, 100))
    scope.value.run("a")
    scope.value.run("b")
    vi.advanceTimersByTime(100)
    expect(callback.mock.calls).toEqual([["b"]])
    scope.value.run("c")
    scope.value.flush()
    expect(callback).toHaveBeenLastCalledWith("c")
    scope.value.run("d")
    scope.stop()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("throttles on both edges and cancels pending work on disposal", () => {
    vi.useFakeTimers()
    const callback = vi.fn<(value: number) => void>()
    const scope = scoped(() => useThrottle(callback, 100))
    scope.value.run(1)
    scope.value.run(2)
    vi.advanceTimersByTime(50)
    scope.value.run(3)
    vi.advanceTimersByTime(50)
    expect(callback.mock.calls).toEqual([[1], [3]])
    scope.value.run(4)
    scope.stop()
    vi.advanceTimersByTime(100)
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it("handles invalid stored JSON and exposes write failures", () => {
    sessionStorage.setItem("profile", "invalid")
    const scope = scoped(() => useStorage(sessionStorage, "profile", "default"))
    expect(scope.value.value.value).toBe("default")
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded")
    })
    scope.value.value.value = "new"
    expect(scope.value.error.value?.message).toBe("Quota exceeded")
    expect(localStorage.getItem("profile")).toBeNull()
  })

  it("stops observing window size when its scope ends", () => {
    const scope = scoped(useWindowSize)
    vi.stubGlobal("innerWidth", 700)
    window.dispatchEvent(new Event("resize"))
    expect(scope.value.value.width).toBe(700)
    scope.stop()
    vi.stubGlobal("innerWidth", 900)
    window.dispatchEvent(new Event("resize"))
    expect(scope.value.value.width).toBe(700)
  })

  it("moves observers between elements and discards queued callbacks", async () => {
    vi.stubGlobal("IntersectionObserver", ObserverDouble)
    const first = document.createElement("div")
    const second = document.createElement("div")
    const target = ref<Element | null>(first)
    const scope = scoped(() => useIntersectionObserver(target))
    ObserverDouble.instances[0].emit(first)
    expect(scope.value.entry.value?.isIntersecting).toBe(true)
    target.value = second
    await nextTick()
    expect(ObserverDouble.instances[0].disconnect).toHaveBeenCalledOnce()
    ObserverDouble.instances[0].emit(first)
    expect(scope.value.entry.value).toBeNull()
    scope.stop()
    expect(ObserverDouble.instances[1].disconnect).toHaveBeenCalledOnce()
  })

  it("returns an unsupported state without inventing intersection results", () => {
    vi.stubGlobal("IntersectionObserver", undefined)
    const scope = scoped(() => useIntersectionObserver(ref(document.createElement("div"))))
    expect(scope.value.supported).toBe(false)
    expect(scope.value.entry.value).toBeNull()
  })

  it("protects manual async state from stale completions and scope disposal", async () => {
    const tasks: { signal: AbortSignal; resolve: (value: string) => void }[] = []
    const scope = scoped(() =>
      useAsyncState(
        (signal: AbortSignal) => new Promise<string>((resolve) => tasks.push({ signal, resolve }))
      )
    )
    const first = scope.value.execute()
    const second = scope.value.execute()
    expect(tasks[0].signal.aborted).toBe(true)
    tasks[1].resolve("new")
    await second
    tasks[0].resolve("old")
    await first
    expect(scope.value.state.value).toEqual({ status: "success", data: "new" })
    const third = scope.value.execute()
    scope.stop()
    expect(tasks[2].signal.aborted).toBe(true)
    tasks[2].resolve("unmounted")
    await third
    expect(scope.value.state.value.status).toBe("loading")
  })

  it("reports manual errors and returns to idle on cancel", async () => {
    const scope = scoped(() =>
      useAsyncState(async () => {
        throw new Error("failed")
      })
    )
    await scope.value.execute()
    expect(scope.value.state.value.status).toBe("error")
    scope.value.cancel()
    expect(scope.value.state.value.status).toBe("idle")
  })

  it("checks HTTP status before decode and supports URL changes", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 404, statusText: "Not Found" })
      .mockResolvedValue({ ok: true, json: async () => ["Vue"] })
    vi.stubGlobal("fetch", fetch)
    const url = ref("/missing.json")
    const decode = vi.fn((body: unknown) => body as string[])
    const scope = scoped(() => useFetch(url, decode))
    await vi.waitFor(() => expect(scope.value.state.value.status).toBe("error"))
    expect(decode).not.toHaveBeenCalled()
    url.value = "/topics.json"
    await vi.waitFor(() =>
      expect(scope.value.state.value).toEqual({ status: "success", data: ["Vue"] })
    )
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true)
  })
})

describe("custom directives", () => {
  it("loads an intersecting image once, rebinds source and disconnects on unmount", async () => {
    vi.stubGlobal("IntersectionObserver", ObserverDouble)
    const source = ref({ src: "/first.svg", error: "/fallback.svg" })
    const view = mount(() => withDirectives(h("img"), [[vLazy, source.value]]))
    const image = view.container.querySelector("img")!
    expect(image.getAttribute("src")).toBeNull()
    const observer = ObserverDouble.instances[0]
    observer.emit(image, false)
    expect(image.getAttribute("src")).toBeNull()
    observer.emit(image)
    expect(image.getAttribute("src")).toBe("/first.svg")
    observer.emit(image)
    expect(observer.disconnect).toHaveBeenCalledOnce()
    image.dispatchEvent(new Event("load"))
    expect(image.dataset.state).toBe("loaded")
    source.value.src = "/second.svg"
    await nextTick()
    observer.emit(image)
    expect(image.getAttribute("src")).toBeNull()
    const next = ObserverDouble.instances[1]
    next.emit(image)
    image.dispatchEvent(new Event("error"))
    expect(image.getAttribute("src")).toBe("/fallback.svg")
    expect(image.dataset.state).toBe("error")
    view.unmount()
    next.emit(image)
    expect(image.getAttribute("src")).toBe("/fallback.svg")
  })

  it("falls back to eager loading when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined)
    const view = mount(() => withDirectives(h("img"), [[vLazy, "/image.svg"]]))
    expect(view.container.querySelector("img")?.getAttribute("src")).toBe("/image.svg")
  })

  it("uses updated outside handlers and removes document listeners", async () => {
    const first = vi.fn()
    const second = vi.fn()
    const callback = ref(first)
    const view = mount(() =>
      withDirectives(h("div", [h("button", "Inside")]), [[vClickOutside, callback.value]])
    )
    view.container
      .querySelector("button")!
      .dispatchEvent(new Event("pointerdown", { bubbles: true, composed: true }))
    expect(first).not.toHaveBeenCalled()
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }))
    expect(first).toHaveBeenCalledOnce()
    callback.value = second
    await nextTick()
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }))
    expect(second).toHaveBeenCalledOnce()
    view.unmount()
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }))
    expect(second).toHaveBeenCalledOnce()
  })
})

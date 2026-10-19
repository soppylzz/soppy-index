import { StrictMode, act, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"
import { useDebouncedValue } from "../hooks/useDebouncedValue.ts"
import { useInterval } from "../hooks/useInterval.ts"
import { usePrevious } from "../hooks/usePrevious.ts"
import { useLocalStorage } from "../hooks/useLocalStorage.ts"
import { useRequest } from "../hooks/useRequest.ts"
import { createStore, useStore } from "../hooks/useStore.ts"
import { Pagination } from "../components/Pagination.tsx"
import { Tabs } from "../components/Tabs.tsx"
import { Tree } from "../components/Tree.tsx"
import { VirtualList, getVisibleRange } from "../components/VirtualList.tsx"
import { TodoList, todoReducer } from "../components/TodoList.tsx"

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const roots: Root[] = []

function mount(node: ReactNode) {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  const render = (next: ReactNode) => act(() => root.render(next))
  render(node)
  return { container, render }
}

function button(container: HTMLElement, text: string) {
  const found = [...container.querySelectorAll("button")].find(
    (element) => element.textContent === text
  )
  if (!found) throw new Error(`Button not found: ${text}`)
  return found
}

afterEach(() => {
  act(() => {
    for (const root of roots.splice(0)) root.unmount()
  })
  document.body.replaceChildren()
  vi.useRealTimers()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe("React hooks", () => {
  it("debounces the latest value and clears pending timers on unmount", () => {
    vi.useFakeTimers()
    function Probe({ value }: { value: string }) {
      return <output>{useDebouncedValue(value, 100)}</output>
    }
    const view = mount(
      <StrictMode>
        <Probe value="a" />
      </StrictMode>
    )
    view.render(
      <StrictMode>
        <Probe value="b" />
      </StrictMode>
    )
    act(() => vi.advanceTimersByTime(50))
    view.render(
      <StrictMode>
        <Probe value="c" />
      </StrictMode>
    )
    act(() => vi.advanceTimersByTime(99))
    expect(view.container.textContent).toBe("a")
    act(() => vi.advanceTimersByTime(1))
    expect(view.container.textContent).toBe("c")
    view.render(null)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("uses the latest interval callback without restarting the timer", () => {
    vi.useFakeTimers()
    const first = vi.fn()
    const latest = vi.fn()
    function Probe({ callback, delay }: { callback: () => void; delay: number | null }) {
      useInterval(callback, delay)
      return null
    }
    const view = mount(
      <StrictMode>
        <Probe callback={first} delay={100} />
      </StrictMode>
    )
    act(() => vi.advanceTimersByTime(50))
    view.render(
      <StrictMode>
        <Probe callback={latest} delay={100} />
      </StrictMode>
    )
    act(() => vi.advanceTimersByTime(50))
    expect(first).not.toHaveBeenCalled()
    expect(latest).toHaveBeenCalledOnce()
    view.render(<Probe callback={latest} delay={null} />)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("returns the previous committed render value", () => {
    function Probe({ value }: { value: number }) {
      return <output>{usePrevious(value) ?? "none"}</output>
    }
    const view = mount(<Probe value={1} />)
    expect(view.container.textContent).toBe("none")
    view.render(<Probe value={2} />)
    expect(view.container.textContent).toBe("1")
    view.render(<Probe value={3} />)
    expect(view.container.textContent).toBe("2")
  })

  it("shares cached store snapshots and unsubscribes", () => {
    const store = createStore(0)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    function Probe() {
      return <output>{useStore(store)}</output>
    }
    const view = mount(
      <>
        <Probe />
        <Probe />
      </>
    )
    act(() => store.setState((value) => value + 1))
    expect(view.container.textContent).toBe("11")
    act(() => store.setState(1))
    expect(listener).toHaveBeenCalledOnce()
    unsubscribe()
    act(() => store.setState(2))
    expect(listener).toHaveBeenCalledOnce()
    expect(view.container.textContent).toBe("22")
  })

  it("synchronizes storage in one tab, accepts functional updates and changes keys", () => {
    localStorage.setItem("counter", "invalid JSON")
    function Probe({ storageKey = "counter" }: { storageKey?: string }) {
      const [value, set] = useLocalStorage(storageKey, 0)
      return <button onClick={() => set((previous) => previous + 1)}>{value}</button>
    }
    const view = mount(
      <>
        <Probe />
        <Probe />
      </>
    )
    act(() => view.container.querySelector("button")!.click())
    expect(view.container.textContent).toBe("11")
    localStorage.setItem("counter", "4")
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", { key: "counter", storageArea: localStorage })
      )
    )
    expect(view.container.textContent).toBe("44")
    view.render(<Probe storageKey="other" />)
    expect(view.container.textContent).toBe("0")
    act(() => view.container.querySelector("button")!.click())
    expect(localStorage.getItem("other")).toBe("1")
    expect(localStorage.getItem("counter")).toBe("4")
  })

  it("ignores stale requests even when a task ignores its signal", async () => {
    const tasks: { signal: AbortSignal; resolve: (value: string) => void }[] = []
    const first = (signal: AbortSignal) =>
      new Promise<string>((resolve) => tasks.push({ signal, resolve }))
    const second = (signal: AbortSignal) =>
      new Promise<string>((resolve) => tasks.push({ signal, resolve }))
    function Probe({ request }: { request: typeof first }) {
      const result = useRequest(request)
      return <output>{result.status === "success" ? result.data : result.status}</output>
    }
    const view = mount(<Probe request={first} />)
    await act(async () => {})
    view.render(<Probe request={second} />)
    await act(async () => {})
    expect(tasks[0].signal.aborted).toBe(true)
    await act(async () => tasks[1].resolve("new"))
    await act(async () => tasks[0].resolve("old"))
    expect(view.container.textContent).toBe("new")
    view.render(null)
    expect(tasks[1].signal.aborted).toBe(true)
  })

  it("exposes synchronous errors and allows reload", async () => {
    const request = vi
      .fn<() => Promise<string>>()
      .mockImplementationOnce(() => {
        throw new Error("failed")
      })
      .mockResolvedValue("ok")
    function Probe() {
      const result = useRequest(request)
      return (
        <button onClick={result.reload}>
          {result.status === "success" ? result.data : result.status}
        </button>
      )
    }
    const view = mount(<Probe />)
    await act(async () => {})
    expect(view.container.textContent).toBe("error")
    await act(async () => view.container.querySelector("button")!.click())
    expect(view.container.textContent).toBe("ok")
  })
})

describe("React components", () => {
  it("keeps pagination controlled and handles an empty total", () => {
    const onChange = vi.fn()
    const view = mount(<Pagination total={100} pageSize={5} page={1} onChange={onChange} />)
    expect(button(view.container, "Previous").disabled).toBe(true)
    act(() => button(view.container, "Next").click())
    expect(onChange).toHaveBeenCalledWith(2)
    expect(view.container.querySelector('[aria-current="page"]')?.textContent).toBe("1")
    view.render(<Pagination total={0} pageSize={5} page={4} onChange={onChange} />)
    expect(button(view.container, "Next").disabled).toBe(true)
    expect(view.container.querySelector('[aria-current="page"]')?.textContent).toBe("1")
  })

  it("supports tab keyboard navigation and empty data", () => {
    const onChange = vi.fn()
    const items = [
      { id: "a", label: "A", content: "Alpha" },
      { id: "b", label: "B", content: "Beta" },
    ]
    const view = mount(<Tabs items={items} value="a" onChange={onChange} />)
    const first = button(view.container, "A")
    act(() =>
      first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }))
    )
    expect(onChange).toHaveBeenCalledWith("b")
    expect(document.activeElement).toBe(button(view.container, "B"))
    view.render(<Tabs items={items} value="b" onChange={onChange} />)
    expect(button(view.container, "B").getAttribute("aria-selected")).toBe("true")
    view.render(<Tabs items={[]} value="a" onChange={onChange} />)
    expect(view.container.textContent).toBe("")
  })

  it("expands and collapses recursive branches", () => {
    const view = mount(
      <Tree nodes={[{ id: "root", label: "Root", children: [{ id: "leaf", label: "Leaf" }] }]} />
    )
    expect(view.container.textContent).not.toContain("Leaf")
    act(() => button(view.container, "Root").click())
    expect(view.container.textContent).toContain("Leaf")
    act(() => button(view.container, "Root").click())
    expect(view.container.textContent).not.toContain("Leaf")
  })

  it("calculates virtual windows at boundaries and validates dimensions", () => {
    expect(getVisibleRange(100, 0, 200, 40)).toEqual({ start: 0, end: 7 })
    expect(getVisibleRange(100, 3800, 200, 40)).toEqual({ start: 93, end: 100 })
    expect(getVisibleRange(0, 1000, 200, 40)).toEqual({ start: 0, end: 0 })
    expect(() => getVisibleRange(1, 0, 200, 0)).toThrow(RangeError)
  })

  it("mounts a bounded window and updates it on scroll", () => {
    const items = Array.from({ length: 2000 }, (_, id) => ({ id: String(id) }))
    const view = mount(
      <VirtualList
        items={items}
        height={200}
        rowHeight={40}
        getKey={(item) => item.id}
        renderItem={(item) => `Row ${item.id}`}
      />
    )
    expect(view.container.querySelectorAll(".virtual-row")).toHaveLength(7)
    const viewport = view.container.firstElementChild as HTMLElement
    act(() => {
      viewport.scrollTop = 400
      viewport.dispatchEvent(new Event("scroll"))
    })
    expect(view.container.querySelector(".virtual-row")?.textContent).toBe("Row 8")
    expect(view.container.querySelectorAll(".virtual-row")).toHaveLength(9)
  })

  it("updates reducer state immutably and rejects blank submissions", () => {
    const initial = [{ id: 1, text: "Task", done: false }]
    const next = todoReducer(initial, { type: "toggle", id: 1 })
    expect(initial[0].done).toBe(false)
    expect(next[0].done).toBe(true)
    expect(todoReducer(next, { type: "remove", id: 1 })).toEqual([])
    expect(todoReducer(initial, { type: "add", id: 2, text: " " })).toBe(initial)
    expect(todoReducer(initial, { type: "add", id: 2, text: " New " })[1].text).toBe("New")
    const view = mount(<TodoList />)
    act(() =>
      view.container
        .querySelector("form")!
        .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    )
    expect(view.container.querySelector('[role="alert"]')?.textContent).toContain("Enter a task")
  })
})

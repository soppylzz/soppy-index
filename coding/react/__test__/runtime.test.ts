import { describe, expect, it, vi } from "vitest"
import { createContext, createHookRuntime, provide } from "../runtime/hooks.ts"

describe("single-component Hooks model", () => {
  it("keeps state snapshots and batches functional updates", async () => {
    const commits: number[] = []
    const runtime = createHookRuntime<number>((value) => commits.push(value))
    let update!: (next: number | ((previous: number) => number)) => void
    let captured = -1
    runtime.render(() => {
      const [value, setValue] = runtime.useState(() => 0)
      update = setValue
      captured = value
      return value
    })
    const initialSetter = update
    update((value) => value + 1)
    update((value) => value + 1)
    expect(captured).toBe(0)
    await runtime.flush()
    expect(commits).toEqual([0, 2])
    expect(update).toBe(initialSetter)
    update(2)
    await runtime.flush()
    expect(commits).toEqual([0, 2])
    runtime.dispose()
    update(3)
    await runtime.flush()
    expect(commits).toEqual([0, 2])
  })

  it("isolates independent component instances", async () => {
    const first = createHookRuntime<number>()
    const second = createHookRuntime<number>()
    let update!: (next: number) => void
    first.render(() => {
      const [value, set] = first.useState(1)
      update = set
      return value
    })
    update(4)
    await first.flush()
    expect(second.render(() => second.useState(1)[0])).toBe(1)
  })

  it("preserves refs and compares memo dependencies with Object.is", () => {
    const runtime = createHookRuntime<{
      ref: { current: number }
      memo: number
      callback: () => number
    }>()
    let dependency = NaN
    const calculate = vi.fn(() => dependency)
    const component = () => ({
      ref: runtime.useRef(0),
      memo: runtime.useMemo(calculate, [dependency]),
      callback: runtime.useCallback(() => dependency, [dependency]),
    })
    const first = runtime.render(component)
    first.ref.current = 3
    const second = runtime.render(component)
    expect(second.ref).toBe(first.ref)
    expect(second.ref.current).toBe(3)
    expect(second.callback).toBe(first.callback)
    expect(calculate).toHaveBeenCalledOnce()
    dependency = -0
    runtime.render(component)
    dependency = 0
    runtime.render(component)
    expect(calculate).toHaveBeenCalledTimes(3)
  })

  it("runs effects after commit and cleans before replacement and disposal", () => {
    const trace: string[] = []
    const runtime = createHookRuntime<string>((value) => trace.push(`commit ${value}`))
    let dependency = 1
    const component = () => {
      const captured = dependency
      runtime.useEffect(() => {
        trace.push(`setup ${captured}`)
        return () => {
          trace.push(`cleanup ${captured}`)
        }
      }, [dependency])
      return String(dependency)
    }
    runtime.render(component)
    runtime.render(component)
    dependency = 2
    runtime.render(component)
    runtime.dispose()
    runtime.dispose()
    expect(trace).toEqual([
      "commit 1",
      "setup 1",
      "commit 1",
      "commit 2",
      "cleanup 1",
      "setup 2",
      "cleanup 2",
    ])
  })

  it("distinguishes omitted and empty dependency arrays", () => {
    const runtime = createHookRuntime<void>()
    const every = vi.fn()
    const once = vi.fn()
    const component = () => {
      runtime.useEffect(every)
      runtime.useEffect(once, [])
    }
    runtime.render(component)
    runtime.render(component)
    expect(every).toHaveBeenCalledTimes(2)
    expect(once).toHaveBeenCalledOnce()
  })

  it("uses the latest reducer with a stable dispatch", async () => {
    const runtime = createHookRuntime<number>()
    let multiplier = 1
    let dispatch!: (value: number) => void
    const component = () => {
      const factor = multiplier
      const [value, send] = runtime.useReducer(
        (state: number, action: number) => state + factor * action,
        0
      )
      dispatch = send
      return value
    }
    runtime.render(component)
    const initialDispatch = dispatch
    multiplier = 2
    runtime.render(component)
    dispatch(3)
    await runtime.flush()
    expect(runtime.render(component)).toBe(6)
    expect(dispatch).toBe(initialDispatch)
  })

  it("reads the closest synchronous provider and restores the outer value", () => {
    const runtime = createHookRuntime<string[]>()
    const context = createContext("default")
    const result = runtime.render(() => [
      runtime.useContext(context),
      provide(context, "outer", () => {
        expect(provide(context, "inner", () => runtime.useContext(context))).toBe("inner")
        return runtime.useContext(context)
      }),
      runtime.useContext(context),
    ])
    expect(result).toEqual(["default", "outer", "default"])
  })

  it("rejects hook order changes and calls outside render", () => {
    const runtime = createHookRuntime<unknown>()
    expect(() => runtime.useRef(1)).toThrow("during render")
    runtime.render(() => runtime.useState(0))
    expect(() => runtime.render(() => runtime.useRef(0))).toThrow("Hook order changed")
    expect(() => runtime.render(() => undefined)).toThrow("Hook count changed")
    runtime.dispose()
    expect(() => runtime.render(() => 1)).toThrow("disposed")
  })
})

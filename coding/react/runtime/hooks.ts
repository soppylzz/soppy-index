type Dependencies = readonly unknown[]
type StateUpdate<T> = T | ((previous: T) => T)
type Cleanup = void | (() => void)
interface Slot {
  kind: string
  value: unknown
}
interface EffectSlot {
  deps?: Dependencies
  cleanup?: () => void
}

export function createContext<T>(defaultValue: T) {
  return { defaultValue, values: [] as T[] }
}

export function provide<T, R>(
  context: ReturnType<typeof createContext<T>>,
  value: T,
  render: () => R
): R {
  context.values.push(value)
  try {
    return render()
  } finally {
    context.values.pop()
  }
}

function sameDependencies(previous?: Dependencies, next?: Dependencies) {
  return (
    previous !== undefined &&
    next !== undefined &&
    previous.length === next.length &&
    previous.every((value, index) => Object.is(value, next[index]))
  )
}

/** A single synchronous component model, not a React renderer. */
export function createHookRuntime<R>(onCommit: (result: R) => void = () => {}) {
  const slots: Slot[] = []
  let cursor = 0
  let rendering = false
  let disposed = false
  let hookCount: number | undefined
  let component: (() => R) | undefined
  let pending: Promise<void> | undefined
  let effects: (() => void)[] = []

  function slot<T>(kind: string, initialize: () => T): T {
    if (!rendering) throw new Error("Hooks must run during render")
    const index = cursor++
    if (!slots[index]) slots[index] = { kind, value: initialize() }
    if (slots[index].kind !== kind) throw new Error("Hook order changed")
    return slots[index].value as T
  }

  function schedule() {
    pending ??= Promise.resolve().then(() => {
      pending = undefined
      if (!disposed && component) render(component)
    })
  }

  function useState<T>(initial: T | (() => T)): [T, (update: StateUpdate<T>) => void] {
    const state = slot("state", () => {
      const cell = {
        value: typeof initial === "function" ? (initial as () => T)() : initial,
        updates: [] as StateUpdate<T>[],
        set(update: StateUpdate<T>) {
          if (disposed) return
          if (rendering) throw new Error("Render-phase state updates are not supported")
          if (!cell.updates.length && typeof update !== "function" && Object.is(cell.value, update))
            return
          cell.updates.push(update)
          schedule()
        },
      }
      return cell
    })
    for (const update of state.updates.splice(0)) {
      state.value =
        typeof update === "function" ? (update as (previous: T) => T)(state.value) : update
    }
    return [state.value, state.set]
  }

  function useRef<T>(initial: T): { current: T } {
    return slot("ref", () => ({ current: initial }))
  }

  function useMemo<T>(calculate: () => T, deps?: Dependencies): T {
    const memo = slot<{ initialized: boolean; deps?: Dependencies; value?: T }>("memo", () => ({
      initialized: false,
    }))
    if (!memo.initialized || !sameDependencies(memo.deps, deps)) {
      const value = calculate()
      memo.value = value
      memo.deps = deps?.slice()
      memo.initialized = true
    }
    return memo.value as T
  }

  function useCallback<A extends unknown[], T>(callback: (...args: A) => T, deps?: Dependencies) {
    return useMemo(() => callback, deps)
  }

  function useEffect(setup: () => Cleanup, deps?: Dependencies) {
    const effect = slot<EffectSlot & { initialized: boolean }>("effect", () => ({
      initialized: false,
    }))
    if (!effect.initialized || !sameDependencies(effect.deps, deps)) {
      effects.push(() => {
        effect.cleanup?.()
        effect.cleanup = undefined
        effect.deps = deps?.slice()
        effect.initialized = true
        effect.cleanup = setup() || undefined
      })
    }
  }

  function useReducer<S, A>(
    reducer: (state: S, action: A) => S,
    initial: S
  ): [S, (action: A) => void] {
    const [state, setState] = useState(() => initial)
    const latestReducer = useRef(reducer)
    latestReducer.current = reducer
    const dispatch = useMemo(
      () => (action: A) => setState((previous) => latestReducer.current(previous, action)),
      []
    )
    return [state, dispatch]
  }

  function useContext<T>(context: ReturnType<typeof createContext<T>>): T {
    if (!rendering) throw new Error("Hooks must run during render")
    return context.values.length ? context.values[context.values.length - 1] : context.defaultValue
  }

  function render(next: () => R): R {
    if (disposed) throw new Error("Runtime has been disposed")
    if (rendering) throw new Error("Nested renders on the same runtime are not supported")
    component = next
    cursor = 0
    effects = []
    rendering = true
    let result: R
    try {
      result = next()
      if (hookCount !== undefined && hookCount !== cursor) throw new Error("Hook count changed")
      hookCount = cursor
    } finally {
      rendering = false
    }
    onCommit(result)
    const committedEffects = effects
    effects = []
    for (const commit of committedEffects) commit()
    return result
  }

  async function flush() {
    while (pending) await pending
  }

  function dispose() {
    disposed = true
    for (const slot of slots) {
      if (slot.kind === "effect") {
        const effect = slot.value as EffectSlot
        effect.cleanup?.()
        effect.cleanup = undefined
      }
    }
  }

  return {
    render,
    flush,
    dispose,
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
    useReducer,
    useContext,
  }
}

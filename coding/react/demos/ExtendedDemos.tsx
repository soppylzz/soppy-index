import { useCallback, useEffect, useState } from "react"
import { createContext, createHookRuntime, provide } from "../runtime/hooks.ts"
import { useToggle } from "../hooks/useToggle.ts"
import { useDebounce } from "../hooks/useDebounce.ts"
import { useThrottle } from "../hooks/useThrottle.ts"
import { useSessionStorage } from "../hooks/useSessionStorage.ts"
import { usePreviousDistinct } from "../hooks/usePreviousDistinct.ts"
import { useWindowSize } from "../hooks/useWindowSize.ts"
import { useScroll } from "../hooks/useScroll.ts"
import { useTimeout } from "../hooks/useTimeout.ts"
import { useEventListener } from "../hooks/useEventListener.ts"
import { useAsync } from "../hooks/useAsync.ts"
import { useLockFn } from "../hooks/useLockFn.ts"
import { useFetch } from "../hooks/useFetch.ts"
import { Accordion } from "../components/Accordion.tsx"
import { AutoComplete } from "../components/AutoComplete.tsx"
import { DynamicForm } from "../components/DynamicForm.tsx"
import { UncontrolledInput } from "../components/UncontrolledInput.tsx"
import { LazyImage } from "../components/LazyImage.tsx"
import { withLoading } from "../hoc/withLoading.tsx"
import { loadTopics } from "../data.ts"

export function decodeTopics(body: unknown): string[] {
  if (!Array.isArray(body) || !body.every((item) => typeof item === "string"))
    throw new TypeError("Expected an array of topic names")
  return body
}
const TopicList = withLoading(({ items }: { items: string[] }) => (
  <ul>
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
))

interface ModelSnapshot {
  count: number
  reducer: number
  doubled: number
  context: string
  increment: () => void
  dispatch: () => void
}
function HookModelDemo() {
  const [snapshot, setSnapshot] = useState<ModelSnapshot | null>(null)
  const [trace, setTrace] = useState<string[]>([])
  useEffect(() => {
    const context = createContext("default")
    const runtime = createHookRuntime<ModelSnapshot>(setSnapshot)
    runtime.render(() =>
      provide(context, "provided theme", () => {
        const [count, setCount] = runtime.useState(0)
        const reference = runtime.useRef("stable ref")
        const doubled = runtime.useMemo(() => count * 2, [count])
        const increment = runtime.useCallback(() => setCount((value) => value + 1), [])
        const [sum, dispatch] = runtime.useReducer(
          (value: number, action: number) => value + action,
          0
        )
        runtime.useEffect(() => {
          setTrace((previous) => [...previous.slice(-5), `setup: ${count}; ${reference.current}`])
          return () => setTrace((previous) => [...previous.slice(-5), `cleanup: ${count}`])
        }, [count])
        return {
          count,
          reducer: sum,
          doubled,
          context: runtime.useContext(context),
          increment,
          dispatch: () => dispatch(2),
        }
      })
    )
    return runtime.dispose
  }, [])
  return (
    <section>
      <h2>Mini Hooks runtime: seven built-in mechanisms</h2>
      <p>This single-component model has slots and a commit step. It is not a React renderer.</p>
      {snapshot && (
        <>
          <output>
            State: {snapshot.count}; memo: {snapshot.doubled}; reducer: {snapshot.reducer}; context:{" "}
            {snapshot.context}
          </output>
          <button onClick={snapshot.increment}>Model setState</button>
          <button onClick={snapshot.dispatch}>Model dispatch +2</button>
        </>
      )}
      <ul>
        {trace.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
    </section>
  )
}

function HookUtilitiesDemo() {
  const [enabled, toggle] = useToggle()
  const [clicks, setClicks] = useState(0)
  const [debounced, setDebounced] = useState(0)
  const [throttled, setThrottled] = useState(0)
  const debounce = useDebounce((value: number) => setDebounced(value), 500)
  const throttle = useThrottle((value: number) => setThrottled(value), 500)
  const previous = usePreviousDistinct(clicks)
  const [note, setNote] = useSessionStorage("interview-note", "Session-only note")
  const [target, setTarget] = useState<HTMLDivElement | null>(null)
  const size = useWindowSize()
  const scroll = useScroll(target)
  const [timeoutDone, setTimeoutDone] = useState(false)
  useTimeout(() => setTimeoutDone(true), 2000)
  const [key, setKey] = useState("none")
  useEventListener(window, "keydown", (event) => setKey((event as KeyboardEvent).key))
  return (
    <section>
      <h2>Callback control and browser subscriptions</h2>
      <button onClick={() => toggle()} aria-pressed={enabled}>
        Toggle: {String(enabled)}
      </button>
      <button
        onClick={() => {
          const next = clicks + 1
          setClicks(next)
          debounce.run(next)
          throttle.run(next)
        }}
      >
        Burst click
      </button>
      <button onClick={debounce.flush}>Flush debounce</button>
      <button
        onClick={() => {
          debounce.cancel()
          throttle.cancel()
        }}
      >
        Cancel pending callbacks
      </button>
      <output>
        Clicks: {clicks}; debounce: {debounced}; throttle: {throttled}; previous distinct:{" "}
        {previous ?? "none"}
      </output>
      <label>
        Session note <input value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      <output>
        Viewport: {size.width} × {size.height}; last key: {key}; timeout:{" "}
        {timeoutDone ? "done" : "waiting"}
      </output>
      <div
        ref={setTarget}
        className="scroll-demo"
        tabIndex={0}
        role="region"
        aria-label="Scroll position demo"
      >
        <div style={{ height: 320 }}>Scroll inside this area.</div>
      </div>
      <output>
        Scroll: {scroll.x}, {scroll.y}
      </output>
    </section>
  )
}

function AsyncDemo() {
  const request = useCallback((signal: AbortSignal, query: string) => loadTopics(query, signal), [])
  const asyncTask = useAsync(request)
  const locked = useLockFn((query: string) => asyncTask.run(query))
  const result = useFetch("/topics.json", decodeTopics)
  return (
    <section>
      <h2>Manual async state, lock and static JSON fetch</h2>
      <button onClick={() => void asyncTask.run("Hooks")}>Run Hooks task</button>
      <button onClick={() => void asyncTask.run("State")}>Replace with State task</button>
      <button onClick={() => void asyncTask.run("error")}>Fail task</button>
      <button onClick={asyncTask.cancel}>Cancel task</button>
      <button onClick={() => void locked("Events")}>Locked task</button>
      <output>Manual task: {asyncTask.state.status}</output>
      {asyncTask.state.status === "success" && (
        <ul>
          {asyncTask.state.data.map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      )}
      {asyncTask.state.status === "error" && <p role="alert">{asyncTask.state.error.message}</p>}
      <TopicList
        loading={result.status === "loading"}
        componentProps={{ items: result.status === "success" ? result.data : [] }}
      />
      {result.status === "error" && <p role="alert">{result.error.message}</p>}
    </section>
  )
}

export function ExtendedDemos() {
  const [framework, setFramework] = useState("")
  const [profile, setProfile] = useState("")
  return (
    <>
      <HookModelDemo />
      <HookUtilitiesDemo />
      <AsyncDemo />
      <section>
        <h2>Autocomplete and disclosure</h2>
        <AutoComplete
          value={framework}
          onChange={setFramework}
          options={["React", "Vue", "Svelte", "Solid", "Angular"]}
        />
        <output>Selected or typed: {framework}</output>
        <Accordion
          items={[
            {
              id: "controlled",
              title: "Controlled values",
              content: "The parent owns the value and receives change requests.",
            },
            {
              id: "identity",
              title: "Stable identity",
              content: "A stable key keeps state attached to the same logical item.",
            },
          ]}
        />
      </section>
      <section>
        <h2>Validation and dynamic fields</h2>
        <DynamicForm onSubmit={(value) => setProfile(JSON.stringify(value))} />
        <output aria-live="polite">{profile}</output>
      </section>
      <section>
        <h2>Uncontrolled input</h2>
        <UncontrolledInput />
      </section>
      <section>
        <h2>IntersectionObserver image loading</h2>
        <p>The source is assigned when the image approaches the viewport.</p>
        <LazyImage
          src="/landscape.svg"
          alt="Mountains under a sunny sky"
          width={640}
          height={240}
        />
      </section>
    </>
  )
}

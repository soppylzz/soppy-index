import { StrictMode, useCallback, useState } from "react"
import { createRoot } from "react-dom/client"
import { useDebouncedValue } from "./hooks/useDebouncedValue.ts"
import { usePrevious } from "./hooks/usePrevious.ts"
import { useInterval } from "./hooks/useInterval.ts"
import { useLocalStorage } from "./hooks/useLocalStorage.ts"
import { useRequest } from "./hooks/useRequest.ts"
import { createStore, useStore } from "./hooks/useStore.ts"
import { Pagination } from "./components/Pagination.tsx"
import { Tabs } from "./components/Tabs.tsx"
import { Tree } from "./components/Tree.tsx"
import { VirtualList } from "./components/VirtualList.tsx"
import { Modal } from "./components/Modal.tsx"
import { TodoList } from "./components/TodoList.tsx"
import { loadTopics, records } from "./data.ts"
import { ExtendedDemos } from "./demos/ExtendedDemos.tsx"
import "./style.css"

const store = createStore(0)

function StoreCounter({ name }: { name: string }) {
  const count = useStore(store)
  return (
    <button onClick={() => store.setState((value) => value + 1)}>
      {name}: {count}
    </button>
  )
}

function SavedName({ label }: { label: string }) {
  const [name, setName] = useLocalStorage("react-interview-name", "Ada")
  return (
    <label>
      {label}
      <input value={name} onChange={(event) => setName(event.target.value)} />
    </label>
  )
}

function App() {
  const [query, setQuery] = useState("")
  const debounced = useDebouncedValue(query)
  const request = useCallback((signal: AbortSignal) => loadTopics(debounced, signal), [debounced])
  const result = useRequest(request)
  const [ticks, setTicks] = useState(0)
  const previous = usePrevious(ticks)
  const [running, setRunning] = useState(false)
  useInterval(() => setTicks((value) => value + 1), running ? 1000 : null)
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState("state")
  const [open, setOpen] = useState(false)
  return (
    <main>
      <h1>React interview implementations</h1>
      <p>React + Vite · fixed local data · no backend</p>
      <section>
        <h2>Debounce and request cancellation</h2>
        <label>
          Search topics <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <p>Try “Hooks”, then “State”; type “error” for a simulated failure.</p>
        <output>Debounced query: {debounced || "(all)"}</output>
        <button onClick={result.reload}>Reload</button>
        {result.status === "loading" && <p role="status">Loading local data…</p>}
        {result.status === "error" && (
          <p role="alert" className="error">
            {result.error.message}
          </p>
        )}
        {result.status === "success" &&
          (result.data.length ? (
            <ul>
              {result.data.map((item) => (
                <li key={item.id}>{item.title}</li>
              ))}
            </ul>
          ) : (
            <p>No matching topics.</p>
          ))}
      </section>
      <section>
        <h2>Interval and previous committed value</h2>
        <output>
          Ticks: {ticks}; previous: {previous ?? "none"}
        </output>
        <button onClick={() => setRunning((value) => !value)}>
          {running ? "Pause timer" : "Start timer"}
        </button>
        <button onClick={() => setTicks((value) => value + 1)}>Increment manually</button>
      </section>
      <section>
        <h2>External store and localStorage</h2>
        <StoreCounter name="Counter A" />
        <StoreCounter name="Counter B" />
        <p>Both counters share one immutable snapshot.</p>
        <SavedName label="Saved name A" />
        <SavedName label="Saved name B" />
      </section>
      <section>
        <h2>Controlled form and reducer</h2>
        <TodoList />
      </section>
      <section>
        <h2>Controlled pagination</h2>
        <ul>
          {records.slice((page - 1) * 5, page * 5).map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
        <Pagination total={records.length} pageSize={5} page={page} onChange={setPage} />
      </section>
      <section>
        <h2>Controlled tabs</h2>
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            {
              id: "state",
              label: "State",
              content: "A setter queues the next render; this render keeps its snapshot.",
            },
            {
              id: "effect",
              label: "Effect",
              content: "Clean up before resubscribing and when the component unmounts.",
            },
            { id: "key", label: "Keys", content: "Stable keys identify siblings across updates." },
          ]}
        />
      </section>
      <section>
        <h2>Recursive disclosure tree</h2>
        <Tree
          nodes={[
            {
              id: "react",
              label: "React",
              children: [
                { id: "hooks", label: "Hooks", children: [{ id: "effect", label: "useEffect" }] },
                { id: "render", label: "Rendering" },
              ],
            },
          ]}
        />
      </section>
      <section>
        <h2>Fixed-height virtual list: 2,000 rows</h2>
        <VirtualList
          items={records}
          height={240}
          rowHeight={40}
          getKey={(item) => item.id}
          renderItem={(item) => item.title}
        />
      </section>
      <ExtendedDemos />
      <section>
        <h2>Portal and native dialog</h2>
        <button onClick={() => setOpen(true)}>Open dialog</button>
        <Modal open={open} title="Interview reminder" onClose={() => setOpen(false)}>
          <p>Explain ownership, cleanup and boundary cases.</p>
          <label>
            Practice note <input />
          </label>
        </Modal>
      </section>
    </main>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

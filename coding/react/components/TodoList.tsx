import { useId, useReducer, useState } from "react"

interface Todo {
  id: number
  text: string
  done: boolean
}
type Action = { type: "add"; text: string; id: number } | { type: "toggle" | "remove"; id: number }

export function todoReducer(state: Todo[], action: Action): Todo[] {
  switch (action.type) {
    case "add":
      return action.text.trim()
        ? [...state, { id: action.id, text: action.text.trim(), done: false }]
        : state
    case "toggle":
      return state.map((item) => (item.id === action.id ? { ...item, done: !item.done } : item))
    case "remove":
      return state.filter((item) => item.id !== action.id)
  }
}

export function TodoList() {
  const [items, dispatch] = useReducer(todoReducer, [
    { id: 1, text: "Explain immutable updates", done: false },
  ])
  const [text, setText] = useState("")
  const [error, setError] = useState("")
  const [nextId, setNextId] = useState(2)
  const errorId = useId()
  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!text.trim()) {
            setError("Enter a task before adding it.")
            return
          }
          dispatch({ type: "add", text, id: nextId })
          setNextId(nextId + 1)
          setText("")
          setError("")
        }}
      >
        <label>
          Task{" "}
          <input
            value={text}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <button type="submit">Add task</button>
        {error && (
          <p className="error" id={errorId} role="alert">
            {error}
          </p>
        )}
      </form>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <label>
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => dispatch({ type: "toggle", id: item.id })}
              />
              {item.text}
            </label>
            <button
              aria-label={`Remove ${item.text}`}
              onClick={() => dispatch({ type: "remove", id: item.id })}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <output>
        {items.filter((item) => item.done).length} / {items.length} completed
      </output>
    </>
  )
}

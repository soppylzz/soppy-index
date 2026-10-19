"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { streamSSE, streamWebSocket } from "../lib/transports.ts"
import type { StreamInput } from "../lib/protocol.ts"
import { useTypewriter } from "./use-typewriter.ts"

export function StreamDemo({ wsPort }: { wsPort: number }) {
  const [transport, setTransport] = useState<"sse" | "ws">("sse")
  const [provider, setProvider] = useState<StreamInput["provider"]>("mock")
  const [prompt, setPrompt] = useState(
    "Explain the difference between SSE and WebSocket in a short paragraph."
  )
  const [speed, setSpeed] = useState(20)
  const [received, setReceived] = useState("")
  const [deltas, setDeltas] = useState(0)
  const [phase, setPhase] = useState<
    "idle" | "connecting" | "streaming" | "received" | "stopped" | "error"
  >("idle")
  const [error, setError] = useState("")
  const active = useRef<AbortController | null>(null)
  const busy = phase === "connecting" || phase === "streaming" || phase === "received"
  const typing = busy && (phase !== "received" || received.length > 0)
  const { text, reset } = useTypewriter(received, typing, speed)
  const done = phase === "received" && text === received
  const locked = busy && !done
  const status = done ? "Done" : phase === "received" ? "Typing buffered text" : phase

  useEffect(
    () => () => {
      active.current?.abort()
    },
    []
  )

  function stop() {
    active.current?.abort()
    active.current = null
    setPhase("stopped")
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    // A generation owns its updates; late events from an older run are ignored.
    active.current?.abort()
    const controller = new AbortController()
    active.current = controller
    reset()
    setReceived("")
    setDeltas(0)
    setError("")
    setPhase("connecting")
    const onDelta = (delta: string) => {
      if (active.current !== controller || controller.signal.aborted) return
      setPhase("streaming")
      setReceived((previous) => previous + delta)
      setDeltas((previous) => previous + 1)
    }
    try {
      const input = { prompt, provider }
      if (transport === "sse") await streamSSE(input, controller.signal, onDelta)
      else await streamWebSocket(input, controller.signal, onDelta, wsPort)
      if (active.current === controller) setPhase("received")
    } catch (cause) {
      if (active.current !== controller || controller.signal.aborted) return
      setError((cause as Error).message)
      setPhase("error")
    }
  }

  return (
    <main>
      <header>
        <p className="eyebrow">Frontend interview / streaming</p>
        <h1>
          One buffer.
          <br />
          Two transports.
        </h1>
        <p className="intro">
          Receive text through SSE or WebSocket, then reveal it at your own pace.
        </p>
      </header>
      <div className="workspace">
        <form onSubmit={submit}>
          <fieldset disabled={locked}>
            <legend>Transport</legend>
            <div className="choices">
              <label>
                <input
                  type="radio"
                  name="transport"
                  value="sse"
                  checked={transport === "sse"}
                  onChange={() => setTransport("sse")}
                />
                SSE
              </label>
              <label>
                <input
                  type="radio"
                  name="transport"
                  value="ws"
                  checked={transport === "ws"}
                  onChange={() => setTransport("ws")}
                />
                WebSocket
              </label>
            </div>
            <label className="field" htmlFor="provider">
              Source
            </label>
            <select
              id="provider"
              value={provider}
              onChange={(event) => setProvider(event.target.value as StreamInput["provider"])}
            >
              <option value="mock">Local mock · no API key</option>
              <option value="glm">GLM · server-side API key</option>
            </select>
            <label className="field" htmlFor="prompt">
              Prompt
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              maxLength={4000}
              required
            />
          </fieldset>
          <label className="field" htmlFor="speed">
            Typing interval · {speed} ms
          </label>
          <input
            id="speed"
            type="range"
            min={5}
            max={60}
            step={5}
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
          />
          <div className="actions">
            <button type="submit" disabled={locked || !prompt.trim()}>
              Generate
            </button>
            <button className="secondary" type="button" onClick={stop} disabled={!locked}>
              Stop
            </button>
          </div>
          <p className="hint">
            {provider === "mock"
              ? "The mock sends a fixed multilingual response. The prompt is used only by GLM."
              : "GLM uses the endpoint, model, and key configured on the server."}
          </p>
        </form>
        <section className="output" aria-label="Generated response">
          <div className="output-heading">
            <h2>Response</h2>
            <span role="status">{status}</span>
          </div>
          <div className="metrics">
            <span>{deltas} deltas</span>
            <span>{received.length} received code units</span>
            <span>{Math.max(0, received.length - text.length)} buffered</span>
          </div>
          <pre data-testid="response">
            {text || <span className="placeholder">Your response will appear here.</span>}
            {locked && (
              <span className="cursor" aria-hidden="true">
                ▍
              </span>
            )}
          </pre>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <details>
            <summary>Inspect received text</summary>
            <pre data-testid="received">{received}</pre>
          </details>
        </section>
      </div>
    </main>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import { Button, Card, Label, ListBox, Select, Table } from "@heroui/react"
import { assets, type AssetName } from "../lib/assets"
import type { Snapshot } from "../lib/state"

const modes = [
  "default",
  "no-cache",
  "reload",
  "no-store",
  "force-cache",
  "only-if-cached",
] as const

type Probe = {
  id: number
  name: AssetName
  mode: RequestCache
  status: number
  version: string
  transfer: number | null
  bodySize: number | null
  serverStatuses: string
}

async function readState(signal: AbortSignal): Promise<Snapshot> {
  const response = await fetch("/api/state", { cache: "no-store", signal })
  if (!response.ok) throw new Error(`State request failed: HTTP ${response.status}`)
  return response.json()
}

export default function CacheLab() {
  const [selected, setSelected] = useState<AssetName>("fresh.svg")
  const [state, setState] = useState<Snapshot | null>(null)
  const [probes, setProbes] = useState<Probe[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("Loading server state…")
  const running = useRef(false)
  const nextProbe = useRef(1)
  const lifecycle = useRef<AbortController | null>(null)

  function log(text: string) {
    const line = `${new Date().toISOString()} ${text}`
    setLogs((previous) => [...previous, line].slice(-30))
    console.log(`[cache-lab] ${line}`)
  }

  useEffect(() => {
    const controller = new AbortController()
    lifecycle.current = controller
    void readState(controller.signal)
      .then((snapshot) => {
        if (!controller.signal.aborted) {
          setState(snapshot)
          setMessage("Ready. Repeat a request before changing the server version.")
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setError(String(failure))
      })
    return () => controller.abort()
  }, [])

  async function probe(mode: RequestCache) {
    const signal = lifecycle.current?.signal
    if (!signal || running.current) return
    running.current = true
    setBusy(true)
    setError("")
    try {
      const before = await readState(signal)
      const lastId = before.requests.at(-1)?.id ?? 0
      const startedAt = performance.now()
      const response = await fetch(`/assets/${selected}`, {
        cache: mode,
        mode: "same-origin",
        signal,
      })
      const body = await response.text()
      const after = await readState(signal)
      if (signal.aborted) return
      const resourceUrl = new URL(`/assets/${selected}`, window.location.href).href
      const timing = performance
        .getEntriesByName(resourceUrl, "resource")
        .filter((entry) => entry.startTime >= startedAt)
        .map((entry) => entry as PerformanceResourceTiming)
        .filter((entry) => entry.initiatorType === "fetch")
        .at(-1)
      const requests = after.requests.filter(
        (entry) => entry.id > lastId && entry.name === selected
      )
      const version = body.match(/data-version="(\d+)"/)?.[1] ?? "—"
      const serverStatuses =
        requests.map((entry) => String(entry.status)).join(", ") || "No new request"
      setState(after)
      setProbes((previous) =>
        [
          ...previous,
          {
            id: nextProbe.current++,
            name: selected,
            mode,
            status: response.status,
            version,
            transfer: timing?.transferSize ?? null,
            bodySize: timing?.encodedBodySize ?? null,
            serverStatuses,
          },
        ].slice(-20)
      )
      setMessage(
        `${selected}: body v${version}, fetch HTTP ${response.status}, server: ${serverStatuses}.`
      )
      log(
        `${selected} cache=${mode}: fetch=${response.status}, body=v${version}, server=${serverStatuses}`
      )
      if (!response.ok) setError(`HTTP ${response.status}. A cache-only miss can return 504.`)
    } catch (failure) {
      if (!signal.aborted) {
        setError(String(failure))
        log(`Probe failed: ${String(failure)}`)
      }
    } finally {
      running.current = false
      setBusy(false)
    }
  }

  async function bump() {
    const signal = lifecycle.current?.signal
    if (!signal || running.current) return
    running.current = true
    setBusy(true)
    setError("")
    try {
      const response = await fetch(`/api/bump?asset=${encodeURIComponent(selected)}`, {
        method: "POST",
        cache: "no-store",
        signal,
      })
      if (!response.ok) throw new Error(`Version update failed: HTTP ${response.status}`)
      const snapshot = await readState(signal)
      if (!signal.aborted) {
        setState(snapshot)
        setMessage(
          `Server ${selected} is now v${snapshot.versions[selected]}. Existing browser entries remain.`
        )
        log(`Server version changed: ${selected} v${snapshot.versions[selected]}`)
      }
    } catch (failure) {
      if (!signal.aborted) setError(String(failure))
    } finally {
      running.current = false
      setBusy(false)
    }
  }

  return (
    <main>
      <header className="lab-heading">
        <p className="eyebrow">Browser / HTTP caching</p>
        <h1>Reuse, validate, or download?</h1>
        <p>Keep the URL fixed. Change the server version, then compare what the browser returns.</p>
      </header>
      <Card className="lab-card">
        <Card.Content>
          <h2>1. Compare five response policies</h2>
          <p className="hint">
            These images prime the browser cache. Their initial previews do not refresh when the
            server version changes.
          </p>
          <div className="asset-grid">
            {assets.map((asset) => (
              <article className="asset" key={asset.name}>
                <img
                  src={`/assets/${asset.name}`}
                  alt={`${asset.name} initial preview`}
                  width={220}
                  height={56}
                />
                <code>{asset.policy}</code>
                <p className="muted">
                  {[asset.etag && "ETag", asset.lastModified && "Last-Modified"]
                    .filter(Boolean)
                    .join(" + ") || "No validator"}
                </p>
                <p>
                  Server:{" "}
                  <strong data-testid={`version-${asset.name}`}>
                    v{state?.versions[asset.name] ?? "…"}
                  </strong>
                </p>
              </article>
            ))}
          </div>
        </Card.Content>
      </Card>
      <Card className="lab-card" aria-busy={busy}>
        <Card.Content>
          <h2>2. Request the same URL again</h2>
          <div className="controls">
            <Select
              id="asset"
              value={selected}
              isDisabled={busy}
              onChange={(value) => {
                if (value) setSelected(value as AssetName)
              }}
            >
              <Label>Resource</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {assets.map((asset) => (
                    <ListBox.Item id={asset.name} key={asset.name} textValue={asset.name}>
                      {asset.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Button isDisabled={busy || !state} onPress={() => void bump()}>
              Change server version
            </Button>
          </div>
          <div className="controls">
            {modes.map((mode) => (
              <Button key={mode} isDisabled={busy || !state} onPress={() => void probe(mode)}>
                {mode}
              </Button>
            ))}
          </div>
          <p className="status" role="status">
            {message}
          </p>
          {error && (
            <p role="alert" className="bad">
              {error}
            </p>
          )}
          <p className="hint">
            Start with default twice. Change fresh.svg, compare force-cache with no-cache, then try
            no-store.svg.
          </p>
          <div className="table-wrap">
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Cache observations">
                  <Table.Header>
                    <Table.Row>
                      <Table.Column isRowHeader>Resource / mode</Table.Column>
                      <Table.Column>Body version</Table.Column>
                      <Table.Column>fetch status</Table.Column>
                      <Table.Column>Server responses</Table.Column>
                      <Table.Column>transferSize / encodedBodySize</Table.Column>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {probes.map((entry) => (
                      <Table.Row key={entry.id} data-testid="probe-result">
                        <Table.Cell>
                          {entry.name}
                          <br />
                          <code>{entry.mode}</code>
                        </Table.Cell>
                        <Table.Cell>v{entry.version}</Table.Cell>
                        <Table.Cell>{entry.status}</Table.Cell>
                        <Table.Cell>{entry.serverStatuses}</Table.Cell>
                        <Table.Cell>
                          {entry.transfer ?? "—"} / {entry.bodySize ?? "—"}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
          <p className="hint">
            A network 304 can become a readable 200 response in fetch. Timing sizes are clues, not
            network status codes.
          </p>
        </Card.Content>
      </Card>
      <Card className="lab-card">
        <Card.Content>
          <h2>3. Check requests that reached the server</h2>
          <p className="hint">
            Resource requests only; newest first, up to 80. State checks are excluded. Other tabs
            can also contribute requests.
          </p>
          <div className="table-wrap">
            <Table>
              <Table.ScrollContainer>
                <Table.Content aria-label="Cache observations">
                  <Table.Header>
                    <Table.Row>
                      <Table.Column isRowHeader>ID / time</Table.Column>
                      <Table.Column>Resource</Table.Column>
                      <Table.Column>Status</Table.Column>
                      <Table.Column>If-None-Match</Table.Column>
                      <Table.Column>If-Modified-Since</Table.Column>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {(state?.requests.toReversed() ?? []).map((entry) => (
                      <Table.Row key={entry.id}>
                        <Table.Cell>
                          {entry.id}
                          <br />
                          {entry.at}
                        </Table.Cell>
                        <Table.Cell>
                          {entry.method} {entry.name}
                        </Table.Cell>
                        <Table.Cell>{entry.status}</Table.Cell>
                        <Table.Cell>
                          <code>{entry.ifNoneMatch ?? "—"}</code>
                        </Table.Cell>
                        <Table.Cell>{entry.ifModifiedSince ?? "—"}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Content>
              </Table.ScrollContainer>
            </Table>
          </div>
          <p className="hint">
            Leave DevTools Disable cache unchecked. Keep the same origin and exclude Service
            Workers. Server restarts reset versions, not browser cache.
          </p>
          <ol className="demo-log" aria-label="Probe log">
            {logs.map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ol>
        </Card.Content>
      </Card>
    </main>
  )
}

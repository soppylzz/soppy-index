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
  serverStatuses: string
}

async function readState(signal: AbortSignal): Promise<Snapshot> {
  const response = await fetch("/api/state", { cache: "no-store", signal })
  if (!response.ok) throw new Error(`State request failed: HTTP ${response.status}`)
  return response.json()
}

export default function CacheLab() {
  const [selected, setSelected] = useState<AssetName>("fresh.svg")
  const [mode, setMode] = useState<RequestCache>("default")
  const [state, setState] = useState<Snapshot | null>(null)
  const [probes, setProbes] = useState<Probe[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("Loading server state…")
  const running = useRef(false)
  const nextProbe = useRef(1)
  const lifecycle = useRef<AbortController | null>(null)

  function log(text: string) {
    console.log(`[cache-lab] ${text}`)
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
        if (!controller.signal.aborted) {
          setMessage("Server state unavailable. Reload the page to retry.")
          setError(String(failure))
        }
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
      const response = await fetch(`/assets/${selected}`, {
        cache: mode,
        mode: "same-origin",
        signal,
      })
      const body = await response.text()
      const after = await readState(signal)
      if (signal.aborted) return
      const requests = after.requests.filter(
        (entry) => entry.id > lastId && entry.name === selected
      )
      const version = body.match(/data-version="(\d+)"/)?.[1] ?? "—"
      const serverStatuses =
        requests
          .map((entry) => {
            const validator = entry.ifNoneMatch
              ? "If-None-Match"
              : entry.ifModifiedSince
                ? "If-Modified-Since"
                : ""
            return validator ? `${entry.status} (${validator})` : String(entry.status)
          })
          .join(", ") || "No new request"
      setState(after)
      const id = nextProbe.current++
      setProbes((previous) =>
        [
          ...previous,
          {
            id,
            name: selected,
            mode,
            status: response.status,
            version,
            serverStatuses,
          },
        ].slice(-10)
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

  const asset = assets.find((candidate) => candidate.name === selected)!

  return (
    <main>
      <Card aria-busy={busy}>
        <Card.Header>
          <Card.Title render={(props) => <h1 {...props} />}>HTTP cache</Card.Title>
          <Card.Description>
            Request a resource, change its server version, then request the same URL again.
          </Card.Description>
        </Card.Header>
        <Card.Content>
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
                  {assets.map((item) => (
                    <ListBox.Item id={item.name} key={item.name} textValue={item.name}>
                      {item.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Select
              id="cache-mode"
              value={mode}
              isDisabled={busy}
              onChange={(value) => {
                if (value) setMode(value as RequestCache)
              }}
            >
              <Label>Request cache mode</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {modes.map((item) => (
                    <ListBox.Item id={item} key={item} textValue={item}>
                      {item}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
            <Button isDisabled={busy || !state} onPress={() => void probe(mode)}>
              Send request
            </Button>
            <Button variant="secondary" isDisabled={busy || !state} onPress={() => void bump()}>
              Change server version
            </Button>
          </div>
          <Card.Description>
            Response: <code>{asset.policy}</code>
            {" · "}
            {[asset.etag && "ETag", asset.lastModified && "Last-Modified"]
              .filter(Boolean)
              .join(" + ") || "No validator"}
            {" · "}Server{" "}
            <strong data-testid={`version-${selected}`}>v{state?.versions[selected] ?? "…"}</strong>
          </Card.Description>
          <p className="status" role="status">
            {message}
          </p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <Table>
            <Table.ScrollContainer>
              <Table.Content aria-label="Cache observations">
                <Table.Header>
                  <Table.Column id="resource-mode" isRowHeader>
                    Resource / mode
                  </Table.Column>
                  <Table.Column id="body-version">Returned version</Table.Column>
                  <Table.Column id="fetch-status">Response.status</Table.Column>
                  <Table.Column id="server-responses">Server response</Table.Column>
                </Table.Header>
                <Table.Body renderEmptyState={() => "Send a request to compare cache behavior."}>
                  {probes.map((entry) => (
                    <Table.Row id={entry.id} key={entry.id} data-testid="probe-result">
                      <Table.Cell>
                        {entry.name}
                        <br />
                        <code>{entry.mode}</code>
                      </Table.Cell>
                      <Table.Cell>{entry.version === "—" ? "—" : `v${entry.version}`}</Table.Cell>
                      <Table.Cell>{entry.status}</Table.Cell>
                      <Table.Cell>{entry.serverStatuses}</Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
          <Card.Description>
            Keep DevTools Disable cache off. A server 304 can appear as fetch 200.
          </Card.Description>
        </Card.Content>
      </Card>
    </main>
  )
}

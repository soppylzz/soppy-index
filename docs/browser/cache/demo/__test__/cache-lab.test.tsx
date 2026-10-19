// @vitest-environment jsdom

import { StrictMode, act } from "react"
import { createRoot } from "react-dom/client"
import { expect, test, vi } from "vitest"
import CacheLab from "../app/cache-lab.tsx"
import { assets } from "../lib/assets.ts"
import type { Snapshot } from "../lib/state.ts"

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

test("the lab requests resources only on demand and compares cache evidence in one table", async () => {
  const snapshot: Snapshot = {
    versions: Object.fromEntries(assets.map((asset) => [asset.name, 1])),
    requests: [
      {
        id: 1,
        at: "2026-01-01T00:00:00.000Z",
        name: "fresh.svg",
        method: "GET",
        status: 200,
        version: 1,
        ifNoneMatch: null,
        ifModifiedSince: null,
      },
    ],
  }
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    if (input === "/api/state") return Response.json(snapshot)
    if (input === "/api/bump?asset=fresh.svg") {
      snapshot.versions["fresh.svg"] = 2
      return Response.json({ version: 2 })
    }
    if (input === "/assets/fresh.svg") {
      return new Response('<svg data-version="1"></svg>', { status: 200 })
    }
    throw new Error(`Unexpected request: ${String(input)}`)
  })
  vi.stubGlobal("fetch", fetchMock)
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  )
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () =>
      root.render(
        <StrictMode>
          <CacheLab />
        </StrictMode>
      )
    )
    const tables = container.querySelectorAll("table")
    expect(tables).toHaveLength(1)
    expect(tables[0].querySelectorAll("thead th")).toHaveLength(4)
    expect(container.querySelectorAll("img")).toHaveLength(0)
    expect(fetchMock.mock.calls.every(([url]) => url === "/api/state")).toBe(true)

    const button = [...container.querySelectorAll("button")].find(
      (element) => element.textContent === "Send request"
    )
    expect(button?.disabled).toBe(false)
    await act(async () => button!.click())

    const result = container.querySelector('[data-testid="probe-result"]')
    expect(result?.querySelectorAll('td, th[scope="row"]')).toHaveLength(4)
    expect(result?.textContent).toContain("v1")
    expect(result?.textContent).toContain("No new request")
    expect(fetchMock).toHaveBeenCalledWith(
      "/assets/fresh.svg",
      expect.objectContaining({
        cache: "default",
        mode: "same-origin",
      })
    )
    const bump = [...container.querySelectorAll("button")].find(
      (element) => element.textContent === "Change server version"
    )
    await act(async () => bump!.click())
    expect(container.querySelector('[data-testid="version-fresh.svg"]')?.textContent).toBe("v2")
    expect(result?.textContent).toContain("v1")
  } finally {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
  }
})

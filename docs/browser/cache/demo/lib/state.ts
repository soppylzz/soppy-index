import { assets, type AssetName } from "./assets.ts"

export type ResourceRequest = {
  id: number
  at: string
  name: AssetName
  method: string
  status: 200 | 304
  version: number
  ifNoneMatch: string | null
  ifModifiedSince: string | null
}

type LabState = {
  versions: Partial<Record<AssetName, number>>
  requests: ResourceRequest[]
  nextId: number
}

// Route modules and development reloads must share one state in this server process.
const processState = globalThis as typeof globalThis & { httpCacheLabState?: LabState }
const state = (processState.httpCacheLabState ??= { versions: {}, requests: [], nextId: 1 })

export function versionOf(name: AssetName): number {
  return state.versions[name] ?? 1
}

export function bumpVersion(name: AssetName): number {
  const version = versionOf(name) + 1
  state.versions[name] = version
  console.log(`[cache-lab] ${name} -> v${version}; browser cache was not invalidated`)
  return version
}

export function recordRequest(request: Omit<ResourceRequest, "id" | "at">): void {
  const entry = { ...request, id: state.nextId++, at: new Date().toISOString() }
  state.requests.push(entry)
  state.requests = state.requests.slice(-80)
  console.log(`[cache-lab] ${JSON.stringify(entry)}`)
}

export function snapshot() {
  return {
    versions: Object.fromEntries(assets.map((asset) => [asset.name, versionOf(asset.name)])),
    requests: [...state.requests],
  }
}

export type Snapshot = ReturnType<typeof snapshot>

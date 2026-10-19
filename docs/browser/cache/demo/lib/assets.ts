export const assets = [
  { name: "fresh.svg", policy: "public, max-age=60", etag: true, lastModified: false },
  { name: "short-fresh.svg", policy: "max-age=1", etag: true, lastModified: true },
  { name: "no-cache.svg", policy: "no-cache", etag: true, lastModified: false },
  { name: "last-modified.svg", policy: "no-cache", etag: false, lastModified: true },
  { name: "no-store.svg", policy: "no-store", etag: false, lastModified: false },
] as const

export type Asset = (typeof assets)[number]
export type AssetName = Asset["name"]

export function findAsset(name: string): Asset | undefined {
  return assets.find((asset) => asset.name === name)
}

import { useState, type ReactNode } from "react"

export function getVisibleRange(
  length: number,
  scrollTop: number,
  height: number,
  rowHeight: number,
  overscan = 2
) {
  if (
    !Number.isInteger(length) ||
    length < 0 ||
    !Number.isFinite(scrollTop) ||
    !Number.isFinite(height) ||
    height <= 0 ||
    !Number.isFinite(rowHeight) ||
    rowHeight <= 0 ||
    !Number.isInteger(overscan) ||
    overscan < 0
  ) {
    throw new RangeError("Invalid virtual list dimensions")
  }
  const top = Math.max(0, Math.min(scrollTop, Math.max(0, length * rowHeight - height)))
  return {
    start: Math.max(0, Math.floor(top / rowHeight) - overscan),
    end: Math.min(length, Math.ceil((top + height) / rowHeight) + overscan),
  }
}

export function VirtualList<T>({
  items,
  height,
  rowHeight,
  getKey,
  renderItem,
}: {
  items: T[]
  height: number
  rowHeight: number
  getKey: (item: T) => string
  renderItem: (item: T, index: number) => ReactNode
}) {
  const [scrollTop, setScrollTop] = useState(0)
  const { start, end } = getVisibleRange(items.length, scrollTop, height, rowHeight)
  return (
    <div
      role="region"
      aria-label="Virtual list"
      tabIndex={0}
      style={{ height, overflow: "auto" }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: items.length * rowHeight, position: "relative" }}>
        <div style={{ position: "absolute", top: start * rowHeight, width: "100%" }}>
          {items.slice(start, end).map((item, offset) => (
            <div className="virtual-row" key={getKey(item)} style={{ height: rowHeight }}>
              {renderItem(item, start + offset)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

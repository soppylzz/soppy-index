export function Pagination({
  total,
  pageSize,
  page,
  onChange,
}: {
  total: number
  pageSize: number
  page: number
  onChange: (page: number) => void
}) {
  if (
    !Number.isInteger(pageSize) ||
    pageSize <= 0 ||
    !Number.isInteger(total) ||
    total < 0 ||
    !Number.isInteger(page)
  ) {
    throw new RangeError("Expected an integer page, a positive page size and a non-negative total")
  }
  const count = Math.max(1, Math.ceil(total / pageSize))
  const current = Math.min(count, Math.max(1, page))
  const start = Math.max(1, Math.min(current - 2, count - 4))
  const pages = Array.from({ length: Math.min(count, 5) }, (_, index) => start + index)
  return (
    <nav aria-label="Pagination">
      <button disabled={current === 1} onClick={() => onChange(1)}>
        First
      </button>
      <button disabled={current === 1} onClick={() => onChange(current - 1)}>
        Previous
      </button>
      {pages.map((value) => (
        <button
          key={value}
          aria-current={current === value ? "page" : undefined}
          onClick={() => onChange(value)}
        >
          {value}
        </button>
      ))}
      <button disabled={current === count} onClick={() => onChange(current + 1)}>
        Next
      </button>
      <button disabled={current === count} onClick={() => onChange(count)}>
        Last
      </button>
    </nav>
  )
}

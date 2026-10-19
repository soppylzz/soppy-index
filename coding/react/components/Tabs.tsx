import { useId, type ReactNode } from "react"

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { id: string; label: string; content: ReactNode }[]
  value: string
  onChange: (value: string) => void
}) {
  const prefix = useId()
  const active = items.find((item) => item.id === value) ?? items[0]
  if (!active) return null
  return (
    <>
      <div role="tablist" aria-label="Interview topics">
        {items.map((item, index) => (
          <button
            key={item.id}
            role="tab"
            id={`${prefix}-tab-${item.id}`}
            aria-controls={`${prefix}-panel-${item.id}`}
            aria-selected={active.id === item.id}
            tabIndex={active.id === item.id ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(event) => {
              let next: number
              if (event.key === "ArrowRight") next = (index + 1) % items.length
              else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length
              else if (event.key === "Home") next = 0
              else if (event.key === "End") next = items.length - 1
              else return
              event.preventDefault()
              onChange(items[next].id)
              event.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>("[role=tab]")
                [next].focus()
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${prefix}-panel-${item.id}`}
          aria-labelledby={`${prefix}-tab-${item.id}`}
          hidden={item.id !== active.id}
          tabIndex={0}
        >
          {item.content}
        </div>
      ))}
    </>
  )
}

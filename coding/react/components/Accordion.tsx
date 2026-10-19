import { useId, useState, type ReactNode } from "react"

export function Accordion({
  items,
}: {
  items: { id: string; title: string; content: ReactNode }[]
}) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const prefix = useId()
  return (
    <div>
      {items.map((item) => (
        <div key={item.id}>
          <h3>
            <button
              id={`${prefix}-button-${item.id}`}
              aria-expanded={expanded === item.id}
              aria-controls={`${prefix}-panel-${item.id}`}
              onClick={() => setExpanded((previous) => (previous === item.id ? null : item.id))}
            >
              {item.title}
            </button>
          </h3>
          <div
            id={`${prefix}-panel-${item.id}`}
            role="region"
            aria-labelledby={`${prefix}-button-${item.id}`}
            hidden={expanded !== item.id}
          >
            {item.content}
          </div>
        </div>
      ))}
    </div>
  )
}

import { useId, useState } from "react"
import { useClickOutside } from "../hooks/useClickOutside.ts"

export function AutoComplete({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  const id = useId()
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const matches = options.filter((option) => option.toLowerCase().includes(value.toLowerCase()))
  const activeIndex = active < matches.length ? active : -1
  useClickOutside(element, () => setOpen(false))
  const choose = (option: string) => {
    onChange(option)
    setOpen(false)
    setActive(-1)
  }
  return (
    <div className="autocomplete" ref={setElement}>
      <label htmlFor={`${id}-input`}>Choose a framework</label>
      <input
        id={`${id}-input`}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && activeIndex >= 0 ? `${id}-${activeIndex}` : undefined}
        value={value}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          onChange(event.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false)
            return
          }
          if (event.key === "Enter" && open && activeIndex >= 0) {
            event.preventDefault()
            choose(matches[activeIndex])
            return
          }
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && matches.length) {
            event.preventDefault()
            setOpen(true)
            setActive(
              event.key === "ArrowDown"
                ? (activeIndex + 1) % matches.length
                : activeIndex <= 0
                  ? matches.length - 1
                  : activeIndex - 1
            )
          }
        }}
      />
      <ul id={`${id}-list`} role="listbox" aria-label="Framework suggestions" hidden={!open}>
        {matches.map((option, index) => (
          <li
            key={option}
            id={`${id}-${index}`}
            role="option"
            aria-selected={index === activeIndex}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(option)}
          >
            {option}
          </li>
        ))}
      </ul>
      {open && !matches.length && <p role="status">No matching frameworks.</p>}
    </div>
  )
}

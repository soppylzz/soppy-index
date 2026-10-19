import { useCallback, useState } from "react"

export function useToggle(initial = false) {
  const [value, setValue] = useState(initial)
  const toggle = useCallback((next?: boolean) => setValue((previous) => next ?? !previous), [])
  return [value, toggle] as const
}

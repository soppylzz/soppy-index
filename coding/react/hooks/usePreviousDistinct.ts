import { useEffect, useRef } from "react"

export function usePreviousDistinct<T>(
  value: T,
  equal: (a: T, b: T) => boolean = Object.is
): T | undefined {
  const committed = useRef<{ current: T; previous: T | undefined }>({
    current: value,
    previous: undefined,
  })
  const changed = !equal(committed.current.current, value)
  const previous = changed ? committed.current.current : committed.current.previous
  useEffect(() => {
    if (!equal(committed.current.current, value)) {
      committed.current = { current: value, previous: committed.current.current }
    }
  }, [value, equal])
  return previous
}

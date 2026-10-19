import { useEffect, useRef } from "react"

export function usePrevious<T>(value: T): T | undefined {
  const previous = useRef<T | undefined>(undefined)
  const committed = previous.current
  useEffect(() => {
    previous.current = value
  }, [value])
  return committed
}

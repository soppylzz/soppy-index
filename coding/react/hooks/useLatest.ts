import { useLayoutEffect, useRef } from "react"

export function useLatest<T>(value: T) {
  const latest = useRef(value)
  useLayoutEffect(() => {
    latest.current = value
  }, [value])
  return latest
}

import { useEffect, useRef } from "react"

export function useInterval(callback: () => void, delay: number | null): void {
  const latest = useRef(callback)
  useEffect(() => {
    latest.current = callback
  }, [callback])
  useEffect(() => {
    if (delay === null) return
    const timer = setInterval(() => latest.current(), delay)
    return () => clearInterval(timer)
  }, [delay])
}

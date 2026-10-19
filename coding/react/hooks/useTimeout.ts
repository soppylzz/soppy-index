import { useEffect } from "react"
import { useLatest } from "./useLatest.ts"

export function useTimeout(callback: () => void, delay: number | null) {
  const latest = useLatest(callback)
  useEffect(() => {
    if (delay === null) return
    const timer = setTimeout(() => latest.current(), delay)
    return () => clearTimeout(timer)
  }, [delay, latest])
}

import { useEffect } from "react"
import { useLatest } from "./useLatest.ts"

export function useEventListener(
  target: EventTarget | null,
  type: string,
  listener: (event: Event) => void,
  options?: boolean | AddEventListenerOptions
) {
  const latest = useLatest(listener)
  const capture = typeof options === "boolean" ? options : (options?.capture ?? false)
  const passive = typeof options === "object" ? options.passive : undefined
  const once = typeof options === "object" ? options.once : undefined
  const signal = typeof options === "object" ? options.signal : undefined
  useEffect(() => {
    if (!target) return
    const handler = (event: Event) => latest.current(event)
    target.addEventListener(type, handler, { capture, passive, once, signal })
    return () => target.removeEventListener(type, handler, capture)
  }, [target, type, capture, passive, once, signal, latest])
}

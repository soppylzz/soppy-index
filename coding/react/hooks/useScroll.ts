import { useLayoutEffect, useState } from "react"
import { useEventListener } from "./useEventListener.ts"

export function useScroll(target: HTMLElement | null) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  useLayoutEffect(() => {
    setPosition({ x: target?.scrollLeft ?? 0, y: target?.scrollTop ?? 0 })
  }, [target])
  useEventListener(
    target,
    "scroll",
    () => {
      setPosition({ x: target!.scrollLeft, y: target!.scrollTop })
    },
    { passive: true }
  )
  return position
}

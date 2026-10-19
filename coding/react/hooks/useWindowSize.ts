import { useState } from "react"
import { useEventListener } from "./useEventListener.ts"

export function useWindowSize() {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  useEventListener(window, "resize", () =>
    setSize({ width: window.innerWidth, height: window.innerHeight })
  )
  return size
}

"use client"

import { useEffect, useRef, useState } from "react"
import { revealNext } from "../lib/typewriter.ts"

export function useTypewriter(target: string, running: boolean, interval: number) {
  const [text, setText] = useState("")
  const displayed = useRef("")
  const previous = useRef(0)
  useEffect(() => {
    if (!running || displayed.current === target) return
    let frame = 0
    const tick = (now: number) => {
      const count = Math.min(8, Math.floor((now - previous.current) / interval))
      if (count > 0) {
        previous.current = now
        displayed.current = revealNext(target, displayed.current, count)
        setText(displayed.current)
      }
      if (displayed.current !== target) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, running, interval])

  function reset() {
    displayed.current = ""
    previous.current = performance.now()
    setText("")
  }
  return { text, reset }
}

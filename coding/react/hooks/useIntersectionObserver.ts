import { useEffect, useState } from "react"

export function useIntersectionObserver(
  target: Element | null,
  options: IntersectionObserverInit = {}
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)
  const { root = null, rootMargin = "0px", threshold = 0 } = options
  // Threshold values, rather than an inline array's identity, define the subscription.
  const thresholds = JSON.stringify(threshold)
  const supported = typeof IntersectionObserver !== "undefined"
  useEffect(() => {
    setEntry(null)
    if (!target || !supported) return
    let active = true
    const observer = new IntersectionObserver(
      (entries) => {
        if (active) setEntry(entries.find((item) => item.target === target) ?? null)
      },
      { root, rootMargin, threshold: JSON.parse(thresholds) as number | number[] }
    )
    observer.observe(target)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [target, root, rootMargin, thresholds, supported])
  return { entry, supported }
}

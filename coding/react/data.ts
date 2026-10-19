export const records = Array.from({ length: 2000 }, (_, index) => ({
  id: `topic-${index + 1}`,
  title: `${["Hooks", "Rendering", "Events", "State", "Accessibility"][index % 5]} example ${index + 1}`,
}))

// A local timer simulates task completion, not HTTP behavior.
export function loadTopics(query: string, signal: AbortSignal): Promise<typeof records> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      reject(new DOMException("Cancelled", "AbortError"))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort)
      if (query.trim().toLowerCase() === "error") reject(new Error("Simulated request failure"))
      else
        resolve(
          records
            .filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5)
        )
    }, 500)
    if (signal.aborted) abort()
    else signal.addEventListener("abort", abort, { once: true })
  })
}

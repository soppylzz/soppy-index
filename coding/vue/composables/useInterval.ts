import { onScopeDispose, ref, watch } from "vue"

export function useInterval(callback: () => void, delay = 1000) {
  const running = ref(false)
  const stop = watch(
    running,
    (active, _previous, onCleanup) => {
      if (!active) return
      const timer = setInterval(callback, delay)
      onCleanup(() => clearInterval(timer))
    },
    { flush: "sync" }
  )
  onScopeDispose(stop)
  return {
    running,
    pause: () => {
      running.value = false
    },
    resume: () => {
      running.value = true
    },
  }
}

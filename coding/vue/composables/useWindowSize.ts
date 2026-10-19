import { onScopeDispose, shallowRef } from "vue"

export function useWindowSize() {
  const size = shallowRef({ width: window.innerWidth, height: window.innerHeight })
  const update = () => {
    size.value = { width: window.innerWidth, height: window.innerHeight }
  }
  window.addEventListener("resize", update, { passive: true })
  onScopeDispose(() => window.removeEventListener("resize", update))
  return size
}

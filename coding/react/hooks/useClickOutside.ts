import { useEventListener } from "./useEventListener.ts"

export function useClickOutside(target: HTMLElement | null, onOutside: (event: Event) => void) {
  useEventListener(
    target?.ownerDocument ?? null,
    "pointerdown",
    (event) => {
      if (target && !event.composedPath().includes(target)) onOutside(event)
    },
    true
  )
}

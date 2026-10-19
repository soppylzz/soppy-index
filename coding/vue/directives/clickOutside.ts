import type { ObjectDirective } from "vue"

type Handler = (event: PointerEvent) => void
const bindings = new WeakMap<
  HTMLElement,
  { handler: Handler; listener: (event: PointerEvent) => void }
>()

export const vClickOutside: ObjectDirective<HTMLElement, Handler> = {
  mounted(element, binding) {
    const state = {
      handler: binding.value,
      listener(event: PointerEvent) {
        if (!event.composedPath().includes(element)) state.handler(event)
      },
    }
    bindings.set(element, state)
    element.ownerDocument.addEventListener("pointerdown", state.listener, true)
  },
  updated(element, binding) {
    const state = bindings.get(element)
    if (state) state.handler = binding.value
  },
  unmounted(element) {
    const state = bindings.get(element)
    if (state) element.ownerDocument.removeEventListener("pointerdown", state.listener, true)
    bindings.delete(element)
  },
}

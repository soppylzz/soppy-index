import type { ObjectDirective } from "vue"

export interface LazySource {
  src: string
  placeholder?: string
  error?: string
}
const disposers = new WeakMap<HTMLImageElement, () => void>()
const sources = new WeakMap<HTMLImageElement, LazySource>()
const normalize = (value: string | LazySource): LazySource =>
  typeof value === "string" ? { src: value } : value

function observe(image: HTMLImageElement, input: LazySource) {
  const source = { ...input }
  disposers.get(image)?.()
  sources.set(image, source)
  let active = true
  let requested = false
  let observer: IntersectionObserver | undefined
  const removeListeners = () => {
    image.removeEventListener("load", loaded)
    image.removeEventListener("error", failed)
  }
  const loaded = () => {
    if (!active) return
    image.dataset.state = "loaded"
    removeListeners()
  }
  const failed = () => {
    if (!active) return
    image.dataset.state = "error"
    removeListeners()
    if (source.error) image.src = source.error
  }
  const load = () => {
    if (!active || requested) return
    requested = true
    observer?.disconnect()
    image.dataset.state = "loading"
    image.addEventListener("load", loaded)
    image.addEventListener("error", failed)
    image.src = source.src
  }
  image.dataset.state = "waiting"
  if (source.placeholder) image.src = source.placeholder
  else image.removeAttribute("src")
  if (typeof IntersectionObserver === "undefined") load()
  else {
    observer = new IntersectionObserver(
      (entries) => {
        if (active && entries.some((entry) => entry.target === image && entry.isIntersecting))
          load()
      },
      { rootMargin: "100px" }
    )
    observer.observe(image)
  }
  disposers.set(image, () => {
    active = false
    observer?.disconnect()
    removeListeners()
  })
}

export const vLazy: ObjectDirective<HTMLImageElement, string | LazySource> = {
  deep: true,
  mounted(image, binding) {
    observe(image, normalize(binding.value))
  },
  updated(image, binding) {
    const next = normalize(binding.value)
    const previous = sources.get(image) ?? { src: "" }
    if (
      next.src !== previous.src ||
      next.placeholder !== previous.placeholder ||
      next.error !== previous.error
    )
      observe(image, next)
  },
  unmounted(image) {
    disposers.get(image)?.()
    disposers.delete(image)
    sources.delete(image)
  },
}

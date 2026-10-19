import { defineComponent, h, ref, withDirectives } from "vue"
import { useToggle } from "../composables/useToggle.ts"
import { useDebounce } from "../composables/useDebounce.ts"
import { useThrottle } from "../composables/useThrottle.ts"
import { useStorage } from "../composables/useStorage.ts"
import { useWindowSize } from "../composables/useWindowSize.ts"
import { useIntersectionObserver } from "../composables/useIntersectionObserver.ts"
import { useAsyncState } from "../composables/useAsyncState.ts"
import { useFetch } from "../composables/useFetch.ts"
import { vLazy } from "../directives/lazy.ts"
import { vClickOutside } from "../directives/clickOutside.ts"

const button = (label: string, onClick: () => void) => h("button", { onClick }, label)
const decodeTopics = (body: unknown): string[] => {
  if (!Array.isArray(body) || !body.every((item) => typeof item === "string"))
    throw new TypeError("Expected topic names")
  return body
}

export const ExtendedDemos = defineComponent({
  setup() {
    const toggle = useToggle()
    const clicks = ref(0)
    const debounced = ref(0)
    const throttled = ref(0)
    const debounce = useDebounce((value: number) => {
      debounced.value = value
    }, 500)
    const throttle = useThrottle((value: number) => {
      throttled.value = value
    }, 500)
    const saved = useStorage(sessionStorage, "vue-interview-session", "Session-only note")
    const size = useWindowSize()
    const target = ref<Element | null>(null)
    const intersection = useIntersectionObserver(target)
    const asyncTask = useAsyncState(async (signal: AbortSignal, shouldFail: boolean) => {
      // Local fixed data goes through the real fetch API.
      const response = await fetch("/topics.json", { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      if (shouldFail) throw new Error("Simulated processing failure")
      return decodeTopics(await response.json())
    })
    const url = ref("/topics.json")
    const fetched = useFetch(url, decodeTopics)
    const outsideCount = ref(0)
    const imageVersion = ref(false)
    return () =>
      h("div", [
        h("section", [
          h("h2", "Toggle, debounce and throttle callbacks"),
          button(`Toggle: ${toggle.value.value}`, () => toggle.toggle()),
          button("Burst click", () => {
            clicks.value++
            debounce.run(clicks.value)
            throttle.run(clicks.value)
          }),
          button("Flush debounce", debounce.flush),
          button("Cancel pending callbacks", () => {
            debounce.cancel()
            throttle.cancel()
          }),
          h(
            "output",
            `Clicks: ${clicks.value}; debounce: ${debounced.value}; throttle: ${throttled.value}`
          ),
        ]),
        h("section", [
          h("h2", "Storage and viewport"),
          h("label", [
            "Session note ",
            h("input", {
              value: saved.value.value,
              onInput: (event: Event) => {
                saved.value.value = (event.target as HTMLInputElement).value
              },
            }),
          ]),
          h(
            "output",
            saved.error.value?.message ?? `Viewport: ${size.value.width} × ${size.value.height}`
          ),
        ]),
        h("section", [
          h("h2", "Manual async state and static JSON fetch"),
          button("Execute task", () => void asyncTask.execute(false)),
          button("Fail task", () => void asyncTask.execute(true)),
          button("Cancel task", asyncTask.cancel),
          h(
            "output",
            `Manual task: ${asyncTask.state.value.status}; fetch: ${fetched.state.value.status}`
          ),
          asyncTask.state.value.status === "error"
            ? h("p", { role: "alert" }, asyncTask.state.value.error.message)
            : h("p", "Manual task starts only when requested."),
          fetched.state.value.status === "success"
            ? h(
                "ul",
                fetched.state.value.data.map((topic) => h("li", { key: topic }, topic))
              )
            : h(
                "p",
                fetched.state.value.status === "error"
                  ? fetched.state.value.error.message
                  : "Loading…"
              ),
        ]),
        h("section", [
          h("h2", "Directives: click outside and lazy image"),
          withDirectives(
            h(
              "div",
              { class: "outside-demo", tabindex: 0 },
              `Click outside this box: ${outsideCount.value}`
            ),
            [
              [
                vClickOutside,
                () => {
                  outsideCount.value++
                },
              ],
            ]
          ),
          h(
            "p",
            "v-lazy assigns src near the viewport, then disconnects the observer. Toggle the source to observe rebinding."
          ),
          button("Change image source", () => {
            imageVersion.value = !imageVersion.value
          }),
          withDirectives(
            h("img", {
              alt: "Mountains under a sunny sky",
              width: 640,
              height: 240,
              style: { maxWidth: "100%", objectFit: "cover" },
            }),
            [[vLazy, `/landscape.svg?v=${Number(imageVersion.value)}`]]
          ),
        ]),
        h("section", [
          h("h2", "IntersectionObserver composable"),
          h("div", { ref: target, class: "outside-demo" }, "Observed element"),
          h(
            "output",
            intersection.supported
              ? `Intersecting: ${intersection.entry.value?.isIntersecting ?? false}`
              : "IntersectionObserver is unavailable."
          ),
        ]),
      ])
  },
})

import { createApp, defineComponent, h, onUnmounted, ref } from "vue"
import * as mini from "./reactivity/index.ts"
import { useDebouncedRef } from "./composables/useDebouncedRef.ts"
import { useEventListener } from "./composables/useEventListener.ts"
import { useInterval } from "./composables/useInterval.ts"
import { useLocalStorage } from "./composables/useLocalStorage.ts"
import { useRequest } from "./composables/useRequest.ts"
import { ExtendedDemos } from "./demos/ExtendedDemos.ts"
import "./style.css"

const topics = ["reactive", "ref", "computed", "watch", "watchEffect", "customRef", "effectScope"]
const button = (label: string, onClick: () => void) => h("button", { onClick }, label)
const section = (title: string, children: ReturnType<typeof h>[]) =>
  h("section", [h("h2", title), ...children])

function loadTopics(query: string, signal: AbortSignal): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer)
      reject(new DOMException("Cancelled", "AbortError"))
    }
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort)
      if (query === "error") reject(new Error("Simulated request failure"))
      else resolve(topics.filter((topic) => topic.toLowerCase().includes(query.toLowerCase())))
    }, 500)
    if (signal.aborted) abort()
    else signal.addEventListener("abort", abort, { once: true })
  })
}

const ComposableDemo = defineComponent({
  setup() {
    const query = useDebouncedRef("")
    const input = ref("")
    const { state, reload } = useRequest(query, loadTopics)
    const count = ref(0)
    const { running, resume, pause } = useInterval(() => {
      count.value++
    })
    const target = ref<HTMLElement | null>(null)
    const clicks = ref(0)
    useEventListener(target, "click", () => {
      clicks.value++
    })
    const savedA = useLocalStorage("vue-interview-name", "Ada")
    const savedB = useLocalStorage("vue-interview-name", "Ada")
    return () =>
      h("div", [
        section("Debounced ref and request cancellation", [
          h("label", [
            "Search topics ",
            h("input", {
              value: input.value,
              onInput: (event: Event) => {
                input.value = (event.target as HTMLInputElement).value
                query.value = input.value
              },
            }),
          ]),
          h("p", "Fixed local data with a simulated delay. Type “error” to test rejection."),
          h("output", `Debounced query: ${query.value || "(all)"}`),
          button("Reload", reload),
          state.value.status === "success"
            ? h(
                "ul",
                state.value.data.length
                  ? state.value.data.map((topic) => h("li", { key: topic }, topic))
                  : [h("li", "No matching topics.")]
              )
            : h(
                "p",
                { role: state.value.status === "error" ? "alert" : "status" },
                state.value.status === "error" ? state.value.error.message : "Loading local data…"
              ),
        ]),
        section("Timer and event listener cleanup", [
          h("output", `Ticks: ${count.value}`),
          button(running.value ? "Pause timer" : "Start timer", () =>
            running.value ? pause() : resume()
          ),
          h("button", { ref: target }, `Tracked clicks: ${clicks.value}`),
        ]),
        section("localStorage synchronization", [
          ...[savedA, savedB].map((saved, index) =>
            h("label", [
              `Saved name ${index === 0 ? "A" : "B"} `,
              h("input", {
                value: saved.value.value,
                onInput: (event: Event) => {
                  saved.value.value = (event.target as HTMLInputElement).value
                },
              }),
            ])
          ),
          h(
            "output",
            savedA.error.value?.message ??
              savedB.error.value?.message ??
              "Changes sync within this tab and across tabs."
          ),
        ]),
      ])
  },
})

const App = defineComponent({
  setup() {
    const state = mini.reactive({ count: 0, useLeft: true, left: "Left", right: "Right" })
    const doubled = mini.computed(() => state.count * 2)
    const snapshot = ref("")
    const logs = ref<string[]>([])
    const append = (message: string) => {
      logs.value = [...logs.value.slice(-7), message]
    }
    const runner = mini.effect(() => {
      snapshot.value = `Count: ${state.count}; doubled: ${doubled.value}; selected: ${state.useLeft ? state.left : state.right}`
    })
    const stopWatch = mini.watch(
      () => state.count,
      (value, previous, cleanup) => {
        append(`watch: ${previous} → ${value}`)
        cleanup(() => append(`cleanup: ${value}`))
      }
    )
    onUnmounted(() => {
      mini.stop(runner)
      stopWatch()
    })
    const mounted = ref(true)
    return () =>
      h("main", [
        h("h1", "Vue interview implementations"),
        h("p", "Handwritten reactivity core + composables using the official Vue runtime"),
        section("Handwritten effect / reactive / computed / watch", [
          h("output", snapshot.value),
          button("Increment", () => {
            state.count++
          }),
          button("Increment twice", () => {
            state.count++
            state.count++
          }),
          button("Switch branch", () => {
            state.useLeft = !state.useLeft
          }),
          button("Change left", () => {
            state.left += "!"
          }),
          button("Change right", () => {
            state.right += "!"
          }),
          h("p", "Effects run synchronously; watch jobs are deduplicated in a microtask."),
          h(
            "ul",
            logs.value.map((message, index) => h("li", { key: index }, message))
          ),
        ]),
        button(mounted.value ? "Unmount composables" : "Mount composables", () => {
          mounted.value = !mounted.value
        }),
        mounted.value
          ? h("div", [h(ComposableDemo), h(ExtendedDemos)])
          : h("p", "Composables unmounted. Timers, requests and listeners have been disposed."),
      ])
  },
})

createApp(App).mount("#root")

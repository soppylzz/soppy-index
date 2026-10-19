import { computed, type Ref } from "vue"
import { useRequest } from "./useRequest.ts"

export function useFetch<T>(url: Ref<string>, decode: (body: unknown) => T) {
  const params = computed(() => url.value)
  return useRequest(params, async (value, signal) => {
    const response = await fetch(value, { signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    return decode(await response.json())
  })
}

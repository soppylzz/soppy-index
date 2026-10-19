import { useCallback } from "react"
import { useRequest } from "./useRequest.ts"

export function useFetch<T>(url: string, decode: (body: unknown) => T) {
  const request = useCallback(
    async (signal: AbortSignal) => {
      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      return decode(await response.json())
    },
    [url, decode]
  )
  return useRequest(request)
}

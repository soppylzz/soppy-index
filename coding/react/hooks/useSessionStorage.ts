import { useStorage } from "./useStorage.ts"

export function useSessionStorage<T>(key: string, initialValue: T) {
  return useStorage(sessionStorage, key, initialValue)
}

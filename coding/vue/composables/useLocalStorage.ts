import { useStorage } from "./useStorage.ts"

export function useLocalStorage<T>(key: string, fallback: T) {
  return useStorage(localStorage, key, fallback)
}

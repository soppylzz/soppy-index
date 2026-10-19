import { useStorage } from "./useStorage.ts"

export function useLocalStorage<T>(key: string, initialValue: T) {
  return useStorage(localStorage, key, initialValue)
}

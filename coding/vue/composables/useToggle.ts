import { ref } from "vue"

export function useToggle(initial = false) {
  const value = ref(initial)
  const toggle = (next?: boolean) => {
    value.value = next ?? !value.value
  }
  return { value, toggle }
}

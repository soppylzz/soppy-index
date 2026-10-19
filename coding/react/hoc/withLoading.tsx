import type { ComponentType } from "react"

export function withLoading<P extends object>(Component: ComponentType<P>) {
  function WithLoading({ loading, componentProps }: { loading: boolean; componentProps: P }) {
    return loading ? <p role="status">Loading content…</p> : <Component {...componentProps} />
  }
  WithLoading.displayName = `withLoading(${Component.displayName ?? Component.name ?? "Component"})`
  return WithLoading
}

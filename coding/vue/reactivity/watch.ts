import { ReactiveEffect } from "./effect.ts"
import { queueJob } from "./scheduler.ts"

type OnCleanup = (cleanup: () => void) => void

export function watch<T>(
  source: () => T,
  callback: (value: T, previous: T | undefined, onCleanup: OnCleanup) => void,
  options: { immediate?: boolean; deep?: boolean; flush?: "sync" | "post" } = {}
) {
  let cleanup: (() => void) | undefined
  let previous: T | undefined
  let initialized = false
  const invalidate = () => {
    const fn = cleanup
    cleanup = undefined
    fn?.()
  }
  const runner = new ReactiveEffect(
    () => {
      const value = source()
      if (options.deep) traverse(value)
      return value
    },
    () => (options.flush === "sync" ? job() : queueJob(job))
  )
  const job = () => {
    if (!runner.active) return
    const value = runner.run() as T
    if (!initialized || options.deep || !Object.is(value, previous)) {
      invalidate()
      const old = previous
      previous = value
      initialized = true
      callback(value, old, (fn) => {
        cleanup = fn
      })
    }
  }
  if (options.immediate) job()
  else {
    previous = runner.run() as T
    initialized = true
  }
  return () => {
    runner.stop()
    invalidate()
  }
}

function traverse(value: unknown, seen = new Set<object>()) {
  if (value === null || typeof value !== "object" || seen.has(value)) return
  seen.add(value)
  for (const key of Object.keys(value)) traverse((value as Record<string, unknown>)[key], seen)
}

export function watchEffect(fn: (onCleanup: OnCleanup) => void) {
  let cleanup: (() => void) | undefined
  const invalidate = () => {
    const previous = cleanup
    cleanup = undefined
    previous?.()
  }
  const runner = new ReactiveEffect(
    () => {
      invalidate()
      fn((next) => {
        cleanup = next
      })
    },
    () => queueJob(job)
  )
  const job = () => {
    if (runner.active) runner.run()
  }
  runner.run()
  return () => {
    runner.stop()
    invalidate()
  }
}

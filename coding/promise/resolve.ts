import { MyPromise } from "./promise.ts"

export function promiseResolve(): MyPromise<void>
export function promiseResolve<T>(value: T): MyPromise<Awaited<T>>
export function promiseResolve(value?: unknown): MyPromise<unknown> {
  if (value instanceof MyPromise && value.constructor === MyPromise) return value

  // The constructor already handles recursive thenable adoption.
  return new MyPromise((resolve) => resolve(value))
}

import { MyPromise } from "./promise.ts"

export function promiseReject<T = never>(reason?: unknown): MyPromise<T> {
  return new MyPromise<T>((_, reject) => reject(reason))
}

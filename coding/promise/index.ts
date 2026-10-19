import { MyPromise as PromiseCore } from "./promise.ts"
import { promiseCatch } from "./catch.ts"
import { promiseFinally } from "./finally.ts"
import { promiseResolve } from "./resolve.ts"
import { promiseReject } from "./reject.ts"
import { promiseAll } from "./all.ts"
import { promiseRace } from "./race.ts"
import { promiseAllSettled } from "./all-settled.ts"
import { promiseAny } from "./any.ts"

declare module "./promise.ts" {
  interface MyPromise<T> {
    catch<TResult = never>(
      onRejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null
    ): MyPromise<T | TResult>
    finally(onFinally?: (() => unknown) | null): MyPromise<T>
  }
}

// Extend our own prototype so every promise returned by then has these methods.
Object.defineProperties(PromiseCore.prototype, {
  catch: { value: promiseCatch, writable: true, configurable: true },
  finally: { value: promiseFinally, writable: true, configurable: true },
})

export const MyPromise = Object.assign(PromiseCore, {
  resolve: promiseResolve,
  reject: promiseReject,
  all: promiseAll,
  race: promiseRace,
  allSettled: promiseAllSettled,
  any: promiseAny,
})

export type MyPromise<T = unknown> = PromiseCore<T>

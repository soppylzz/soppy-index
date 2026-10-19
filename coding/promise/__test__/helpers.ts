import { resolve as resolvePath } from "node:path"

async function loadSubject(): Promise<PromiseConstructor> {
  if (process.env.PROMISE_TEST_REFERENCE === "native") return Promise

  const modulePath = resolvePath(import.meta.dirname, "../index.ts")
  let subject
  try {
    subject = await import(/* @vite-ignore */ modulePath)
  } catch (cause) {
    throw new Error(
      "Cannot load coding/promise/index.ts. Check the MyPromise entry and its imported modules.",
      { cause }
    )
  }
  if (typeof subject.MyPromise !== "function") {
    throw new Error("coding/promise/index.ts must export a constructor named MyPromise.")
  }

  // This test-side type describes calls under test, not the learner's internal design.
  return subject.MyPromise as PromiseConstructor
}

export const MyPromise = await loadSubject()

/** Captures controls for a pending subject; it does not implement settlement behavior. */
export function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new MyPromise<T>((resolveValue, rejectReason) => {
    resolve = resolveValue
    reject = rejectReason
  })
  return { promise, resolve, reject }
}

/** Observes a bounded interval; this cannot prove permanent pending behavior. */
export async function expectPending(promise: PromiseLike<unknown>) {
  const { expect } = await import("vitest")
  const events: string[] = []
  promise.then(
    () => {
      events.push("fulfilled")
    },
    () => {
      events.push("rejected")
    }
  )
  await new Promise<void>((resolve) => setTimeout(resolve, 20))
  expect(events).toEqual([])
}

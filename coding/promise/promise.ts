type State = "pending" | "fulfilled" | "rejected"

type Executor<T> = (
  resolve: (value: T | PromiseLike<T>) => void,
  reject: (reason?: unknown) => void
) => void

export class MyPromise<T = unknown> implements PromiseLike<T> {
  private state: State = "pending"
  private value!: T
  private reason: unknown
  private fulfilledCallbacks: Array<() => void> = []
  private rejectedCallbacks: Array<() => void> = []

  constructor(executor: Executor<T>) {
    if (typeof executor !== "function") {
      throw new TypeError("Executor must be a function")
    }

    // A pending promise may already be locked to another promise.
    let locked = false

    const resolve = (value: T | PromiseLike<T>) => {
      if (locked) return
      locked = true
      this.resolveValue(value)
    }

    const reject = (reason?: unknown) => {
      if (locked) return
      locked = true
      this.rejectValue(reason)
    }

    try {
      executor(resolve, reject)
    } catch (error) {
      reject(error)
    }
  }

  private fulfill(value: unknown): void {
    if (this.state !== "pending") return
    this.state = "fulfilled"
    this.value = value as T

    const callbacks = this.fulfilledCallbacks
    this.fulfilledCallbacks = []
    this.rejectedCallbacks = []

    for (const callback of callbacks) callback()
  }

  private rejectValue(reason: unknown): void {
    if (this.state !== "pending") return
    this.state = "rejected"
    this.reason = reason

    const callbacks = this.rejectedCallbacks
    this.fulfilledCallbacks = []
    this.rejectedCallbacks = []

    for (const callback of callbacks) callback()
  }

  private resolveValue(value: unknown): void {
    if (value === this) {
      this.rejectValue(new TypeError("Cannot resolve a promise with itself"))
      return
    }

    if (value === null || (typeof value !== "object" && typeof value !== "function")) {
      this.fulfill(value)
      return
    }

    let then: unknown
    try {
      // Read once because accessing then may invoke a getter.
      then = (value as { then?: unknown }).then
    } catch (error) {
      this.rejectValue(error)
      return
    }

    if (typeof then !== "function") {
      this.fulfill(value)
      return
    }

    queueMicrotask(() => {
      // Each thenable invocation accepts only its first notification.
      let called = false
      try {
        then.call(
          value,
          (nextValue: unknown) => {
            if (called) return
            called = true
            this.resolveValue(nextValue)
          },
          (reason: unknown) => {
            if (called) return
            called = true
            this.rejectValue(reason)
          }
        )
      } catch (error) {
        if (called) return
        called = true
        this.rejectValue(error)
      }
    })
  }

  then<TResult1 = T, TResult2 = never>(
    onFulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onRejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): MyPromise<TResult1 | TResult2> {
    return new MyPromise<TResult1 | TResult2>((resolve, reject) => {
      const fulfilledTask = () => {
        queueMicrotask(() => {
          try {
            if (typeof onFulfilled === "function") {
              resolve(onFulfilled(this.value))
            } else {
              resolve(this.value as unknown as TResult1)
            }
          } catch (error) {
            reject(error)
          }
        })
      }

      const rejectedTask = () => {
        queueMicrotask(() => {
          try {
            if (typeof onRejected === "function") {
              resolve(onRejected(this.reason))
            } else {
              reject(this.reason)
            }
          } catch (error) {
            reject(error)
          }
        })
      }

      if (this.state === "pending") {
        this.fulfilledCallbacks.push(fulfilledTask)
        this.rejectedCallbacks.push(rejectedTask)
      } else if (this.state === "fulfilled") {
        fulfilledTask()
      } else {
        rejectedTask()
      }
    })
  }
}

import { describe, expect, it } from "vitest"
import { MyPromise, deferred } from "./helpers.ts"

describe("06 static resolve and reject", () => {
  it("wraps a plain value in a subject instance", async () => {
    const promise = MyPromise.resolve(35)
    expect(promise).toBeInstanceOf(MyPromise)
    await expect(promise).resolves.toBe(35)
  })

  it("allows resolve without an argument", async () => {
    await expect(MyPromise.resolve()).resolves.toBeUndefined()
  })

  it("returns the same promise when its constructor matches", () => {
    const promise = new MyPromise(() => {})
    expect(MyPromise.resolve(promise)).toBe(promise)
  })

  it("adopts an external thenable", async () => {
    const value = {
      then(resolve: (value: number) => void) {
        resolve(36)
      },
    }
    await expect(MyPromise.resolve(value as never)).resolves.toBe(36)
  })

  it("adopts a pending native promise", async () => {
    let complete!: (value: number) => void
    const native = new Promise<number>((resolve) => {
      complete = resolve
    })
    const promise = MyPromise.resolve(native)
    expect(promise).toBeInstanceOf(MyPromise)
    complete(37)
    await expect(promise).resolves.toBe(37)
  })

  it("rejects a thenable whose then getter throws", async () => {
    const error = new Error("getter failed")
    const value = {
      get then() {
        throw error
      },
    }
    await expect(MyPromise.resolve(value)).rejects.toBe(error)
  })

  it("creates a rejected subject instance", async () => {
    const reason = { message: "failure" }
    const promise = MyPromise.reject(reason)
    expect(promise).toBeInstanceOf(MyPromise)
    await expect(promise).rejects.toBe(reason)
  })

  it("allows reject without an argument", async () => {
    await expect(MyPromise.reject()).rejects.toBeUndefined()
  })

  it("does not unwrap a promise used as a rejection reason", async () => {
    const task = deferred<number>()
    await expect(MyPromise.reject(task.promise)).rejects.toBe(task.promise)
  })

  it("does not read then on a rejection reason", async () => {
    const reason = {
      get then() {
        throw new Error("must not be read")
      },
    }
    await expect(MyPromise.reject(reason)).rejects.toBe(reason)
  })
})

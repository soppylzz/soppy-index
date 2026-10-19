import { describe, expect, it } from "vitest"
import { composeMiddleware } from "../chain-of-responsibility.ts"

describe("middleware chain", () => {
  it("enters in order and unwinds after awaited next", async () => {
    const run = composeMiddleware<string[]>([
      async (events, next) => {
        events.push("A before")
        await next()
        events.push("A after")
      },
      async (events, next) => {
        events.push("B before")
        await next()
        events.push("B after")
      },
      (events) => {
        events.push("handler")
      },
    ])
    const events: string[] = []
    await run(events)
    expect(events).toEqual(["A before", "B before", "handler", "B after", "A after"])
  })
  it("stops when a middleware does not delegate", async () => {
    const run = composeMiddleware<string[]>([
      (events) => {
        events.push("denied")
      },
      (events) => {
        events.push("unreachable")
      },
    ])
    const events: string[] = []
    await run(events)
    expect(events).toEqual(["denied"])
  })
  it("lets upstream middleware handle downstream errors", async () => {
    const run = composeMiddleware<string[]>([
      async (events, next) => {
        try {
          await next()
        } catch {
          events.push("handled")
        }
      },
      () => {
        throw new Error("failure")
      },
    ])
    const events: string[] = []
    await run(events)
    expect(events).toEqual(["handled"])
  })
  it("rejects duplicate next calls and keeps separate invocations independent", async () => {
    const invalid = composeMiddleware([
      async (_, next) => {
        await next()
        await next()
      },
    ])
    await expect(invalid(undefined)).rejects.toThrow("multiple times")
    const run = composeMiddleware<{ count: number }>([
      async (context, next) => {
        context.count += 1
        await next()
      },
    ])
    const first = { count: 0 }
    const second = { count: 0 }
    await Promise.all([run(first), run(second)])
    expect(first.count).toBe(1)
    expect(second.count).toBe(1)
    await expect(composeMiddleware([])(undefined)).resolves.toBeUndefined()
  })
})

export type Submission<Value> =
  { status: "invalid"; errors: readonly string[] } | { status: "submitted"; value: Value }

export interface FormServices<Input, Value> {
  validate(input: Input): readonly string[]
  submit(input: Input): Value | PromiseLike<Value>
}

export function createFormFacade<Input, Value>(services: FormServices<Input, Value>) {
  let busy = false
  return {
    get busy(): boolean {
      return busy
    },
    async submit(input: Input): Promise<Submission<Awaited<Value>>> {
      if (busy) throw new Error("Submission already in progress")
      const errors = services.validate(input)
      if (errors.length > 0) return { status: "invalid", errors: [...errors] }
      busy = true
      try {
        const value = await services.submit(input)
        return { status: "submitted", value }
      } finally {
        busy = false
      }
    },
  }
}

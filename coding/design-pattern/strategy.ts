export type ValidationStrategy = (value: string) => string | undefined

export const required: ValidationStrategy = (value) => (value.trim() ? undefined : "Required")

export function minLength(length: number): ValidationStrategy {
  if (!Number.isInteger(length) || length < 0) throw new RangeError("Invalid minimum length")
  return (value) => (value.length >= length ? undefined : `Minimum length is ${length}`)
}

export class FieldValidator {
  private strategy: ValidationStrategy

  constructor(strategy: ValidationStrategy) {
    this.strategy = strategy
  }

  setStrategy(strategy: ValidationStrategy): void {
    this.strategy = strategy
  }

  validate(value: string): string | undefined {
    return this.strategy(value)
  }
}

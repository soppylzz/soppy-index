export function unique<T>(array: readonly T[]): T[] {
  const seen = new Set<T>()
  const result: T[] = []
  for (const value of array) {
    if (seen.has(value)) continue
    seen.add(value)
    result.push(value)
  }
  return result
}

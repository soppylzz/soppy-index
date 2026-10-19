export async function mapLimit<T, Result>(
  values: Iterable<T>,
  limit: number,
  mapper: (value: T, index: number) => Result | PromiseLike<Result>
): Promise<Awaited<Result>[]> {
  if (!Number.isInteger(limit) || limit < 1)
    throw new RangeError("Limit must be a positive integer")
  const items = Array.from(values)
  const results: Awaited<Result>[] = new Array(items.length)
  let cursor = 0
  let failed = false

  const worker = async () => {
    while (!failed && cursor < items.length) {
      const index = cursor++
      try {
        results[index] = await mapper(items[index], index)
      } catch (error) {
        failed = true
        throw error
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

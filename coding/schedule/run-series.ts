export async function runSeries<Result>(
  tasks: Iterable<() => Result | PromiseLike<Result>>
): Promise<Awaited<Result>[]> {
  const results: Awaited<Result>[] = []
  for (const task of tasks) {
    results.push(await task())
  }
  return results
}

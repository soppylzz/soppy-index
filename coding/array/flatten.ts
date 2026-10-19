export function flatten(array: readonly unknown[], depth = 1): unknown[] {
  if (Number.isNaN(depth) || depth < 0) depth = 0
  depth = Math.floor(depth)
  const result: unknown[] = []
  const visit = (items: readonly unknown[], remaining: number) => {
    const length = items.length
    for (let index = 0; index < length; index += 1) {
      if (!(index in items)) continue
      const value = items[index]
      if (Array.isArray(value) && remaining > 0) visit(value, remaining - 1)
      else result.push(value)
    }
  }
  visit(array, depth)
  return result
}

export function filter<T, This = undefined>(
  array: readonly T[],
  predicate: (this: This, value: T, index: number, array: readonly T[]) => unknown,
  thisArg?: This
): T[] {
  if (typeof predicate !== "function") throw new TypeError("Predicate must be callable")
  const result: T[] = []
  const length = array.length
  for (let index = 0; index < length; index += 1) {
    if (!(index in array)) continue
    const value = array[index]
    if (predicate.call(thisArg as This, value, index, array)) result.push(value)
  }
  return result
}

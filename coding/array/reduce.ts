export function reduce<T>(
  array: readonly T[],
  callback: (acc: T, value: T, index: number, array: readonly T[]) => T
): T
export function reduce<T, Result>(
  array: readonly T[],
  callback: (acc: Result, value: T, index: number, array: readonly T[]) => Result,
  initial: Result
): Result
export function reduce<T, Result>(
  array: readonly T[],
  callback: (acc: Result, value: T, index: number, array: readonly T[]) => Result,
  ...initial: [Result] | []
): Result {
  if (typeof callback !== "function") throw new TypeError("Callback must be callable")
  const length = array.length
  let index = 0
  let accumulator: Result
  if (initial.length) accumulator = initial[0]
  else {
    while (index < length && !(index in array)) index += 1
    if (index === length)
      throw new TypeError("Cannot reduce an empty array without an initial value")
    accumulator = array[index++] as unknown as Result
  }
  for (; index < length; index += 1) {
    if (index in array) accumulator = callback(accumulator, array[index], index, array)
  }
  return accumulator
}

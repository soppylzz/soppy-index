export function map<T, Result, This = undefined>(
  array: readonly T[],
  callback: (this: This, value: T, index: number, array: readonly T[]) => Result,
  thisArg?: This
): Result[] {
  if (typeof callback !== "function") throw new TypeError("Callback must be callable")
  const length = array.length
  const result = new Array<Result>(length)
  for (let index = 0; index < length; index += 1) {
    if (index in array) result[index] = callback.call(thisArg as This, array[index], index, array)
  }
  return result
}

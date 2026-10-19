export function compose<T>(...functions: Array<(value: T) => T>): (value: T) => T {
  return (value) => {
    let result = value
    for (let index = functions.length - 1; index >= 0; index -= 1) {
      result = functions[index](result)
    }
    return result
  }
}

function dailyTemperatures(temperatures: number[]): number[] {
  // monotonic stack
  const stack: number[] = []
  const res = Array(temperatures.length).fill(0)

  for (let i = 0; i < temperatures.length; i++) {
    while (stack.length && temperatures[stack[stack.length - 1]] < temperatures[i]) {
      const prevIdx = stack.pop()!
      res[prevIdx] = i - prevIdx
    }
    stack.push(i)
  }

  return res
}

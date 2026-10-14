// next greater element: monotonic increasing stack of indices, O(n)
function nextGreater(nums: number[]): number[] {
  const result: number[] = new Array(nums.length).fill(-1)
  const stack: number[] = []
  for (let i = 0; i < nums.length; i++) {
    while (stack.length > 0 && nums[i] > nums[stack[stack.length - 1]]) {
      result[stack.pop()!] = nums[i]
    }
    stack.push(i)
  }
  return result
}

/**
 * days until a warmer temperature
 * https://leetcode.cn/problems/daily-temperatures/
 */
function dailyTemperatures(temps: number[]): number[] {
  const result: number[] = new Array(temps.length).fill(0)
  const stack: number[] = []
  for (let i = 0; i < temps.length; i++) {
    while (stack.length > 0 && temps[i] > temps[stack[stack.length - 1]]) {
      const j = stack.pop()!
      result[j] = i - j
    }
    stack.push(i)
  }
  return result
}

/**
 * largest rectangle in histogram: pop height, width = right edge - left shorter - 1
 * https://leetcode.cn/problems/largest-rectangle-in-histogram/
 */
function largestRectangleArea(heights: number[]): number {
  let max = 0
  const stack: number[] = []
  for (let i = 0; i <= heights.length; i++) {
    const h = i === heights.length ? 0 : heights[i]
    while (stack.length > 0 && h < heights[stack[stack.length - 1]]) {
      const height = heights[stack.pop()!]
      const left = stack.length > 0 ? stack[stack.length - 1] : -1
      max = Math.max(max, height * (i - left - 1))
    }
    stack.push(i)
  }
  return max
}

/* ==================== demo ==================== */
console.log(nextGreater([2, 1, 2, 4, 3]))
console.log(dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73]))
console.log(largestRectangleArea([2, 1, 5, 6, 2, 3]))

export {}

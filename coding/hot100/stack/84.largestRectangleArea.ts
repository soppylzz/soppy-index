function largestRectangleArea(heights: number[]): number {
  heights.push(0)

  const stack = [-1]
  let maxRect = 0

  for (let i = 0; i < heights.length; i++) {
    while (stack.length > 1 && heights[i] < heights[stack[stack.length - 1]]) {
      const h = heights[stack.pop()!]
      const w = i - stack[stack.length - 1] - 1
      maxRect = Math.max(maxRect, h * w)
    }
    stack.push(i)
  }

  heights.pop()
  return maxRect
}

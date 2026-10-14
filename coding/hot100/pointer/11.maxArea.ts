function maxArea(height: number[]): number {
  let maxArea = 0,
    left = 0,
    right = height.length - 1,
    currentArea

  while (left < right) {
    currentArea = Math.min(height[left], height[right]) * (right - left)
    maxArea = Math.max(currentArea, maxArea)

    if (height[left] > height[right]) right--
    else left++
  }

  return maxArea
}

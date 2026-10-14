function jump(nums: number[]): number {
  let end = 0
  let steps = 0
  let maxRight = 0

  for (let i = 0; i < nums.length - 1; i++) {
    maxRight = Math.max(maxRight, i + nums[i])

    if (i === end) {
      steps++
      end = maxRight
    }
  }

  return steps
}

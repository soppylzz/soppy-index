function canJump(nums: number[]): boolean {
  let maxReach = 0

  for (let i = 0; i < nums.length; i++) {
    const range = nums[i]
    if (maxReach < i) break
    if (maxReach <= i + range) {
      maxReach = i + range
    }
  }

  return maxReach >= nums.length - 1
}

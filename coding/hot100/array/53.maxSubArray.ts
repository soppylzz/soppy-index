// Kadane's algorithm (dp)
function maxSubArray(nums: number[]): number {
  let currentMax = nums[0],
    globalMax = nums[0]

  for (let i = 1; i < nums.length; i++) {
    // light: dp[i] = max(nums[i], dp[i-1] + nums[i])
    currentMax = Math.max(nums[i], currentMax + nums[i])
    globalMax = Math.max(globalMax, currentMax)
  }

  return globalMax
}

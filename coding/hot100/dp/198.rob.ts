function rob(nums: number[]): number {
  // exclude length=1 case
  if (nums.length === 1) return nums[0]

  // dp[i] = max(dp[i-1], dp[i-2] + nums[i])
  const dp = [nums[0], Math.max(nums[0], nums[1])]
  let maxRob = Math.max(...dp)

  for (let i = 2; i < nums.length; i++) {
    dp[i] = Math.max(dp[i - 1], dp[i - 2] + nums[i])
    maxRob = Math.max(maxRob, dp[i])
  }

  return maxRob
}

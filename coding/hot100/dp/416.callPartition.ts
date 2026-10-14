// classic 0-1 knapsack problem
function canPartition(nums: number[]): boolean {
  /**
   * NOT splitting the array by contiguous indices.
   * e.g. [1,5,3,5,6] => [1,3,6] & [5,5]
   */
  const sum = nums.reduce((acc, cur) => acc + cur, 0)
  if (sum % 2 === 1) return false

  const cap = sum / 2
  const dp = Array(cap + 1).fill(false)
  dp[0] = true

  for (const num of nums) {
    for (let i = cap; i >= num; i--) {
      dp[i] = dp[i] || dp[i - num]
    }
  }

  return dp[cap]
}

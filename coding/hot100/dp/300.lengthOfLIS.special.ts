// solution: 1) patience sort 2) dp
function lengthOfLIS(nums: number[]): number {
  const n = nums.length
  const dp = Array(nums.length)

  dp[0] = 1
  let maxLength = 1,
    curMax

  for (let i = 1; i < n; i++) {
    curMax = 1
    for (let j = i - 1; j >= 0; j--) {
      if (nums[j] < nums[i]) {
        curMax = Math.max(curMax, dp[j] + 1)
      }
    }

    dp[i] = curMax
    maxLength = Math.max(curMax, maxLength)
  }

  return maxLength
}

function lengthOfLISViaPatienceSorting(nums: number[]): number {
  const piles: number[] = []

  for (const num of nums) {
    let left = 0,
      right = piles.length

    while (left < right) {
      const mid = (left + right) >> 1
      if (piles[mid] < num) {
        left = mid + 1
      } else {
        right = mid
      }
    }

    piles[left] = num
  }

  return piles.length
}

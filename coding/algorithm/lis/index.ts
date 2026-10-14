/**
 * DP: dp[i] = longest strictly increasing run ending at i, O(n^2)
 * https://leetcode.cn/problems/longest-increasing-subsequence/
 */
function lengthOfLISdp(nums: number[]): number {
  const dp: number[] = new Array(nums.length).fill(1)
  let best = 0
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < i; j++) {
      if (nums[j] < nums[i]) dp[i] = Math.max(dp[i], dp[j] + 1)
    }
    best = Math.max(best, dp[i])
  }
  return best
}

/**
 * patience sorting: tails[k] = smallest tail among increasing subsequences of length k+1
 * lower-bound binary search per element, O(nlogn)
 * https://leetcode.cn/problems/longest-increasing-subsequence/
 */
function lengthOfLIS(nums: number[]): number {
  const tails: number[] = []
  for (const num of nums) {
    let lo = 0
    let hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (tails[mid] < num) lo = mid + 1
      else hi = mid
    }
    if (lo === tails.length) tails.push(num)
    else tails[lo] = num
  }
  return tails.length
}

// reconstruct one LIS in O(nlogn): remember each card's pile and the card it rests on
function lisOf(nums: number[]): number[] {
  const tails: number[] = []
  const topIndex: number[] = []
  const prev: number[] = []
  for (let i = 0; i < nums.length; i++) {
    let lo = 0
    let hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (tails[mid] < nums[i]) lo = mid + 1
      else hi = mid
    }
    prev[i] = lo > 0 ? topIndex[lo - 1] : -1
    if (lo === tails.length) {
      tails.push(nums[i])
      topIndex.push(i)
    } else {
      tails[lo] = nums[i]
      topIndex[lo] = i
    }
  }
  const path: number[] = []
  for (let i = topIndex[tails.length - 1]; i >= 0; i = prev[i]) path.push(nums[i])
  return path.reverse()
}

/* ==================== demo ==================== */
const nums = [10, 9, 2, 5, 3, 7, 101, 18]
console.log(lengthOfLISdp(nums))
console.log(lengthOfLIS(nums))
console.log(lisOf(nums))

export {}

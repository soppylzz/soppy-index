function subarraySum(nums: number[], k: number): number {
  // tip: nums[i] may be negative, so a sliding window does not apply
  // tip: twoSum + preSum
  let count = 0
  const cache = new Map<number, number>()

  const preSum = [nums[0]]
  for (let i = 1; i < nums.length; i++) {
    preSum[i] = preSum[i - 1] + nums[i]
  }

  // fix: handle cases like ([1,2], k = 3), or seed the cache via cache.set(0, 1)
  for (let i = 0; i < preSum.length; i++) {
    if (preSum[i] === k) count++
  }

  for (let i = 0; i < preSum.length; i++) {
    // preSum[i] - need = k
    const need = preSum[i] - k
    if (cache.has(need)) {
      count += cache.get(need)!
    }
    cache.set(preSum[i], (cache.get(preSum[i]) ?? 0) + 1)
  }

  return count
}

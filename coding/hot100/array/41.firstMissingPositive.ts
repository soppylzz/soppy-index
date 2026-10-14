function firstMissingPositiveEquivalent(nums: number[]): number {
  const cache = Array(nums.length + 1).fill(0)

  for (const num of nums) {
    if (num <= nums.length) cache[num - 1] = 1
  }

  let findIdx = -1
  for (let i = 0; i < cache.length; i++) {
    if (cache[i] === 0) {
      findIdx = i
      break
    }
  }

  return findIdx + 1
}

// two solutions: 1. 10^4 hash; 2. in-place hash
function firstMissingPositiveInPlace(nums: number[]): number {
  const n = nums.length

  for (let i = 0; i < n; i++) {
    while (1 <= nums[i] && nums[i] <= n && nums[i] !== nums[nums[i] - 1]) {
      const correctIdx = nums[i] - 1
      ;[nums[i], nums[correctIdx]] = [nums[correctIdx], nums[i]]
    }
  }

  for (let i = 0; i < n; i++) {
    if (nums[i] !== i + 1) {
      return i + 1
    }
  }
  return n + 1
}

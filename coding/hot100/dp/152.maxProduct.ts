function maxProduct(nums: number[]): number {
  const n = nums.length

  // light: maintain two dp arrays
  const dpMax = Array(n)
  const dpMin = Array(n)

  dpMax[0] = nums[0]
  dpMin[0] = nums[0]

  let maxProd = nums[0]

  for (let i = 1; i < n; i++) {
    const num = nums[i]

    dpMax[i] = Math.max(dpMax[i - 1] * num, dpMin[i - 1] * num, num)
    dpMin[i] = Math.min(dpMax[i - 1] * num, dpMin[i - 1] * num, num)

    maxProd = Math.max(dpMax[i], maxProd)
  }

  return maxProd
}

console.log(maxProduct([-2, -3, -4, -5, 10]))

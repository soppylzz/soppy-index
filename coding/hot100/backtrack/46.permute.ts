function permute(nums: number[]): number[][] {
  let depth = 0

  const n = nums.length,
    flags = Array(nums.length).fill(false),
    result: number[][] = []

  function traverse(prefix: number[]) {
    depth++
    for (let i = 0; i < n; i++) {
      if (flags[i]) continue
      flags[i] = true

      const arr = [...prefix, nums[i]]
      if (depth === n) {
        result.push(arr)
      } else {
        traverse(arr)
      }

      flags[i] = false
    }
    depth--
  }

  traverse([])

  return result
}

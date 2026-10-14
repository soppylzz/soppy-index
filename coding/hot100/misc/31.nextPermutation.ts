function nextPermutationIntuitive(nums: number[]): void {
  /**
   * consider these cases:
   * - xxx 123 => xxx 132
   * - xxx 1321 => xxx 2113
   * - xxx 0321 => xxx 1023
   */

  const stack: number[] = []
  for (const n of nums) stack.push(n)

  const cache: number[] = []
  while (stack.length) {
    const num = stack.pop()!
    if (cache.length > 0 && num < cache[cache.length - 1]) {
      for (let i = 0; i < cache.length; i++) {
        if (cache[i] > num) {
          nums[nums.length - cache.length - 1] = cache[i]
          cache[i] = num
          break
        }
      }
      break
    } else {
      cache.push(num)
    }
  }

  for (let i = 0; i < cache.length; i++) nums[nums.length - cache.length + i] = cache[i]
}

function nextPermutation(nums: number[]): void {
  let left = nums.length - 2,
    replace

  for (; left >= 0; left--) {
    if (nums[left] < nums[left + 1]) break
  }

  function swap(i: number, j: number) {
    ;[nums[i], nums[j]] = [nums[j], nums[i]]
  }

  if (left >= 0) {
    for (let i = nums.length - 1; i >= 0; i--) {
      if (nums[i] > nums[left]) {
        swap(i, left)
        break
      }
    }
  }
  left++

  let n = nums.length - 1
  while (left < n) {
    swap(left++, n--)
  }
}

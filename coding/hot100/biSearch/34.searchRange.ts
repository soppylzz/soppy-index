function searchRange(nums: number[], target: number): number[] {
  /**
   * Note: binary search for one occurrence, then binary search the range start/end.
   * Naive left/right expansion is O(n) worst case, so binary search the boundaries instead.
   */

  let left = 0,
    right = nums.length,
    mid = 0

  while (left < right) {
    mid = (left + right) >> 1
    const num = nums[mid]

    if (num === target) {
      break
    } else if (num > target) {
      right = mid
    } else {
      left = mid + 1
    }
  }

  // target not found
  if (nums[mid] !== target) return [-1, -1]

  // find range start
  let midRight = mid + 1,
    midLeft = mid

  while (left < midRight) {
    const mid = (left + midRight) >> 1
    const num = nums[mid]

    if (num === target) {
      midRight = mid
    } else {
      left = mid + 1
    }
  }

  // find range end
  while (midLeft < right) {
    const mid = (midLeft + right) >> 1
    const num = nums[mid]

    if (num === target) {
      midLeft = mid + 1
    } else {
      right = mid
    }
  }

  return [left, right - 1]
}

console.log(searchRange([1, 2, 3, 3, 4, 5], 3))

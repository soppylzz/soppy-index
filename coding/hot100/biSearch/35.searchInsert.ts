function searchInsert(nums: number[], target: number): number {
  let left = 0,
    right = nums.length

  while (left < right) {
    const mid = (left + right) >> 1
    const num = nums[mid]

    if (num > target) {
      right = mid
    } else if (num < target) {
      left = mid + 1
    } else {
      return mid
    }
  }

  return left
}

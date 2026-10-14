function search(nums: number[], target: number): number {
  if (nums.length === 0) return -1
  if (nums.length === 1) return nums[0] === target ? 0 : -1

  let left = 0,
    right = nums.length

  while (left < right) {
    const mid = (left + right) >> 1
    const num = nums[mid]

    if (num >= nums[0]) {
      left = mid + 1
    } else {
      right = mid
    }
  }

  if (target >= nums[0]) {
    right = left
    left = 0
  } else {
    right = nums.length
  }

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

  return -1
}

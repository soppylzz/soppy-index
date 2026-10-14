function findMin(nums: number[]): number {
  let left = 0,
    right = nums.length

  while (left < right) {
    const mid = (left + right) >> 1

    if (nums[mid] >= nums[0]) {
      left = mid + 1
    } else {
      right = mid
    }
  }

  return nums[left % nums.length]
}

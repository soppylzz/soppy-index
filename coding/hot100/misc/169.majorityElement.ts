function majorityElement(nums: number[]): number {
  // Boyer-Moore voting
  let major = nums[0]
  let count = 1

  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== major) count--
    else count++

    if (count < 0) {
      major = nums[i]
      count = 0
    }
  }

  return major
}

console.log(majorityElement([10, 9, 9, 9, 10]))

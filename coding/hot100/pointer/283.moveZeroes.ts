// single-pointer solution
function moveZeroesSimple(nums: number[]): void {
  let offset = 0

  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === 0) {
      offset++
    } else {
      ;[nums[i], nums[i - offset]] = [nums[i - offset], nums[i]]
    }
  }

  for (let i = 0; i < offset; i++) {
    nums[nums.length - 1 - i] = 0
  }
}

// slow/fast pointer solution
function moveZeroes(nums: number[]): void {
  let slow = 0,
    fast = 0

  while (fast < nums.length) {
    while (nums[fast] === 0) {
      fast++
    }

    if (fast >= nums.length) break

    nums[slow] = nums[fast]
    fast++
    slow++
  }

  while (slow < nums.length) {
    nums[slow] = 0
    slow++
  }
}

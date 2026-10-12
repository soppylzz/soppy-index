// normal way
function rotate(nums: number[], k: number): void {
  // fix: handle k >= nums.length
  k = k % nums.length

  const temp = Array(k)
  for (let i = nums.length - k; i < nums.length; i++) temp[i - nums.length + k] = nums[i]
  for (let i = nums.length - 1; i >= k; i--) nums[i] = nums[i - k]
  for (let i = 0; i < k; i++) nums[i] = temp[i]
}

// flip way
function flip(nums: number[], start: number, end: number) {
  while (start < end) {
    const temp = nums[start]
    nums[start] = nums[end]
    nums[end] = temp

    // alternative swap without a temp variable (slower)
    // nums[start] = nums[end] + nums[start]
    // nums[end] = nums[start] - nums[end]
    // nums[start] = nums[start] - nums[end]

    start++
    end--
  }
}

function rotateViaFlip(nums: number[], k: number) {
  k = k % nums.length
  const n = nums.length
  flip(nums, 0, n - 1)
  flip(nums, 0, k - 1)
  flip(nums, k, n - 1)
}

// cycle way

// module scope: same-name solutions in other files must not collide
export {}

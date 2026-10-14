/**
 * solutions:
 * 1. cyclic sort
 * 2. graph + slow/fast pointer (best), like 142.detectCycle
 *
 * points:
 * - nums.length == n + 1
 * - 1 <= nums[i] <= n
 */
function findDuplicateCyclic(nums: number[]): number {
  function swap(i: number, j: number) {
    ;[nums[i], nums[j]] = [nums[j], nums[i]]
  }

  for (let i = 0; i < nums.length; i++) {
    if (nums[i] === i + 1) continue

    while (nums[i] !== i + 1) {
      const to = nums[i] - 1
      if (nums[to] === nums[i]) return nums[i]
      swap(i, to)
    }
  }
  // never reached
  return -1
}

function findDuplicate(nums: number[]): number {
  let slow = 0,
    fast = 0

  while (true) {
    slow = nums[slow]
    fast = nums[nums[fast]]
    if (slow === fast) break
  }

  slow = 0
  while (true) {
    slow = nums[slow]
    fast = nums[fast]
    if (slow === fast) break
  }

  return slow
}

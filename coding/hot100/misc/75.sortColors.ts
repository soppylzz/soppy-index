// Dutch national flag
function sortColors(nums: number[]): void {
  let left = 0,
    right = nums.length - 1,
    p = 0

  function swap(l: number, r: number) {
    ;[nums[l], nums[r]] = [nums[r], nums[l]]
  }

  while (p <= right) {
    if (nums[p] === 0) {
      swap(p, left++)
      p++
    } else if (nums[p] === 2) {
      swap(p, right--)
    } else {
      p++
    }
  }
}

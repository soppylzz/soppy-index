// needs review
function threeSum(nums: number[]): number[][] {
  nums.sort((a, b) => a - b)
  const threeArr = []

  for (let i = 0; i < nums.length; i++) {
    const num = nums[i]
    if (num > 0) break
    if (i > 0 && nums[i] === nums[i - 1]) continue

    // note: fix the first element, then use two pointers on the rest
    let [left, right] = [i + 1, nums.length - 1]
    while (left < right) {
      const sum = num + nums[left] + nums[right]
      if (sum === 0) {
        threeArr.push([num, nums[left], nums[right]])

        // fix: skip duplicate values
        while (left < right && nums[left] === nums[left + 1]) left++
        while (left < right && nums[right] === nums[right - 1]) right--

        left++
        right--
      } else {
        if (sum > 0) {
          right--
        } else {
          left++
        }
      }
    }
  }

  return threeArr
}

function threeSumReview(nums: number[]): number[][] {
  const n = nums.length
  const result: number[][] = []

  let left = 0,
    mid,
    right,
    diff

  nums.sort((a, b) => a - b)

  while (nums[left] <= 0 && left < n - 2) {
    while (left > 0 && nums[left] === nums[left - 1]) {
      left++
    }

    mid = left + 1
    right = n - 1

    while (mid < right) {
      diff = nums[left] + nums[mid] + nums[right]
      if (diff === 0) {
        result.push([nums[left], nums[mid], nums[right]])

        // light: handle duplicate values here
        while (mid < right && nums[mid] === nums[mid + 1]) mid++
        while (mid < right && nums[right] === nums[right - 1]) right--

        mid++
        right--
      } else if (diff > 0) right--
      else mid++
    }

    left++
  }

  return result
}

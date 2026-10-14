function twoSum(nums: number[], target: number): number[] {
  // 1. sort + two pointers => O(nlogn)
  // 2. hash map complement lookup => O(n) (implemented below)
  const adds = new Map<number, number>()

  for (let i = 0; i < nums.length; i++) {
    const num = nums[i]
    if (adds.has(num)) {
      return [adds.get(num)!, i]
    }
    adds.set(target - num, i)
  }
  return []
}

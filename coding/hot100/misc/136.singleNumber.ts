function singleNumber(nums: number[]): number {
  // light: xor
  return nums.reduce((acc, cur) => acc ^ cur, 0)
}

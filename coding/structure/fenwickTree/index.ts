class FenwickTree {
  private tree: number[]

  // 1-indexed: positions 1..n
  constructor(n: number) {
    this.tree = new Array(n + 1).fill(0)
  }

  // a[i] += delta
  update(i: number, delta: number): void {
    for (; i < this.tree.length; i += i & -i) this.tree[i] += delta
  }

  // sum of a[1..i]
  prefixSum(i: number): number {
    let sum = 0
    for (; i > 0; i -= i & -i) sum += this.tree[i]
    return sum
  }

  rangeSum(left: number, right: number): number {
    return this.prefixSum(right) - this.prefixSum(left - 1)
  }
}

/**
 * count pairs i < j with a[i] > a[j]: scan from the right, ask BIT for smaller ranks
 * https://leetcode.cn/problems/shu-zu-zhong-de-ni-xu-dui-lcof/
 */
function countInversions(nums: number[]): number {
  const sorted = [...new Set(nums)].sort((a, b) => a - b)
  const rankOf = new Map(sorted.map((v, i) => [v, i + 1]))
  const bit = new FenwickTree(sorted.length)
  let inversions = 0
  for (let i = nums.length - 1; i >= 0; i--) {
    const rank = rankOf.get(nums[i])!
    if (rank > 1) inversions += bit.prefixSum(rank - 1)
    bit.update(rank, 1)
  }
  return inversions
}

/* ==================== demo ==================== */
const bit = new FenwickTree(5)
const values = [3, 1, 4, 1, 5]
values.forEach((v, i) => bit.update(i + 1, v))
console.log(bit.prefixSum(3))
console.log(bit.rangeSum(2, 4))
bit.update(3, -2)
console.log(bit.rangeSum(2, 4))
console.log(countInversions([5, 1, 3, 2]))

export {}

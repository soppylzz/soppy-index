// just memorize this solution
function findMedianSortedArrays(nums1: number[], nums2: number[]): number {
  const m = nums1.length
  const n = nums2.length
  function findKth(i: number, j: number, k: number) {
    if (i >= m) return nums2[j + k - 1]
    if (j >= n) return nums1[i + k - 1]
    if (k === 1) return Math.min(nums1[i], nums2[j])

    const half = k >> 1
    const ni = Math.min(i + half, m) - 1
    const nj = Math.min(j + half, n) - 1

    if (nums1[ni] <= nums2[nj]) {
      const removed = ni - i + 1
      return findKth(ni + 1, j, k - removed)
    } else {
      const removed = nj - j + 1
      return findKth(i, nj + 1, k - removed)
    }
  }

  const total = m + n
  if (total % 2 === 1) {
    return findKth(0, 0, (total >> 1) + 1)
  } else {
    const left = findKth(0, 0, total / 2)
    const right = findKth(0, 0, total / 2 + 1)
    return (left + right) / 2
  }
}

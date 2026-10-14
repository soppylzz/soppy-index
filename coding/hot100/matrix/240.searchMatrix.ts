function searchMatrix(matrix: number[][], target: number): boolean {
  const m = matrix.length
  const n = matrix[0].length

  let row = 0,
    col = n - 1

  // light: treat the matrix as a binary search tree rooted at the top-right
  while (row < m && col >= 0) {
    const cur = matrix[row][col]

    if (cur === target) {
      return true
    } else if (cur > target) {
      col--
    } else {
      row++
    }
  }
  return false
}

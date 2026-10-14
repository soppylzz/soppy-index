function searchMatrix(matrix: number[][], target: number): boolean {
  const [m, n] = [matrix.length, matrix[0].length]

  let left = 0,
    right = m * n

  while (left < right) {
    const mid = (left + right) >> 1

    const [x, y] = [Math.floor(mid / n), mid % n]
    const num = matrix[x][y]

    if (num > target) {
      right = mid
    } else if (num < target) {
      left = mid + 1
    } else {
      return true
    }
  }

  return false
}

// module scope: same-name solutions in other files must not collide
export {}

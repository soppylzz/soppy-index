function clearZero(matrix: number[][], m: number, n: number) {
  for (let i = 0; i < matrix[m].length; i++) matrix[m][i] = 0
  for (let i = 0; i < matrix.length; i++) matrix[i][n] = 0
}

function setZeroesStupid(matrix: number[][]): void {
  const zeros = []
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[0].length; j++) {
      if (matrix[i][j] === 0) {
        zeros.push([i, j])
      }
    }
  }
  for (const [i, j] of zeros) {
    clearZero(matrix, i, j)
  }
}

function setZeroes(matrix: number[][]): void {
  let firstRowHasZero = false
  let firstColHasZero = false

  for (let i = 0; i < matrix[0].length; i++) {
    if (matrix[0][i] === 0) {
      firstRowHasZero = true
      break
    }
  }

  for (let i = 0; i < matrix.length; i++) {
    if (matrix[i][0] === 0) {
      firstColHasZero = true
      break
    }
  }

  // skip first row/col to avoid interference
  for (let i = 1; i < matrix.length; i++) {
    for (let j = 1; j < matrix[0].length; j++) {
      if (matrix[i][j] === 0) {
        matrix[0][j] = 0
        matrix[i][0] = 0
      }
    }
  }

  // skip first row/col to avoid interference
  for (let i = 1; i < matrix.length; i++) {
    for (let j = 1; j < matrix[0].length; j++) {
      if (matrix[i][0] === 0 || matrix[0][j] === 0) matrix[i][j] = 0
    }
  }

  if (firstRowHasZero) {
    for (let i = 0; i < matrix[0].length; i++) matrix[0][i] = 0
  }

  if (firstColHasZero) {
    for (let i = 0; i < matrix.length; i++) matrix[i][0] = 0
  }
}

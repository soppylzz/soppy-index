function generate(numRows: number): number[][] {
  // dp[i][j] = dp[i-1][j-1] + dp[i-1][j]
  const result = [[1]]
  if (numRows === 1) return result

  let prevRow = [1]

  for (let i = 1; i < numRows; i++) {
    const curRow = [1]
    // note: row i has i+1 elements; j stops at i-1 to exclude the last element
    for (let j = 1; j < i; j++) curRow[j] = prevRow[j - 1] + prevRow[j]
    curRow.push(1)
    prevRow = curRow
    result.push(curRow)
  }

  return result
}

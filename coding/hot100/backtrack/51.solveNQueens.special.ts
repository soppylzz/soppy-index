// classic backtrack problem
function solveNQueens(n: number): string[][] {
  const result: string[][] = []

  function printRow(q: number) {
    const row = Array(n).fill(".")
    row[q] = "Q"
    return row.join("")
  }

  /**
   * tip: use sets to track occupied columns and diagonals.
   *
   * light: no need for a 2D flag matrix; diagonal conflicts
   * can be identified by col + row and col - row.
   */
  const colFlag = new Set<number>()
  const diag1Flag = new Set<number>()
  const diag2Flag = new Set<number>()

  const rows: number[] = []

  function dfs(row: number) {
    if (row === n) {
      result.push(rows.map((r) => printRow(r)))
      return
    }

    for (let col = 0; col < n; col++) {
      if (colFlag.has(col)) continue
      if (diag1Flag.has(col + row)) continue
      if (diag2Flag.has(col - row)) continue

      colFlag.add(col)
      diag1Flag.add(col + row)
      diag2Flag.add(col - row)

      rows.push(col)
      dfs(row + 1)
      rows.pop()

      colFlag.delete(col)
      diag1Flag.delete(col + row)
      diag2Flag.delete(col - row)
    }
  }

  dfs(0)

  return result
}

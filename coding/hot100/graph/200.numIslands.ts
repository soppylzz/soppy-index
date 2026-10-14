// dfs flood fill: sink each island
function numIslands(grid: string[][]): number {
  let count = 0
  const m = grid.length
  const n = grid[0].length

  function dfs(row: number, col: number) {
    if (row < 0 || col < 0 || row >= m || col >= n || grid[row][col] === "0") return

    grid[row][col] = "0"

    dfs(row - 1, col)
    dfs(row + 1, col)
    dfs(row, col - 1)
    dfs(row, col + 1)
  }

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === "1") {
        count++
        dfs(i, j)
      }
    }
  }

  return count
}

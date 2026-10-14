function exist(board: string[][], word: string): boolean {
  const [m, n] = [board.length, board[0].length]

  const flags: boolean[][] = Array(m)
  for (let i = 0; i < m; i++) flags[i] = Array(n).fill(false)

  function dfs(x: number, y: number, depth: number): boolean {
    if (depth === word.length) {
      return true
    } else {
      if (x >= m || y >= n || x < 0 || y < 0 || flags[x][y] || board[x][y] !== word[depth])
        return false

      flags[x][y] = true
      const found: boolean =
        dfs(x + 1, y, depth + 1) ||
        dfs(x - 1, y, depth + 1) ||
        dfs(x, y + 1, depth + 1) ||
        dfs(x, y - 1, depth + 1)
      flags[x][y] = false

      return found
    }
  }

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (dfs(i, j, 0)) return true
    }
  }

  return false
}

function orangesRotting(grid: number[][]): number {
  const m = grid.length
  const n = grid[0].length

  let hasOne = false

  const queue: [number, number][] = []
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 2) {
        queue.push([i, j])
      }
      if (grid[i][j] === 1) {
        hasOne = true
      }
    }
  }

  function rot(i: number, j: number) {
    if (i >= m || i < 0 || j >= n || j < 0 || grid[i][j] !== 1) return
    grid[i][j] = 2
    queue.push([i, j])
  }

  if (queue.length === 0) return hasOne ? -1 : 0

  let count = -1
  while (queue.length) {
    let current = queue.length

    while (current) {
      const [i, j] = queue.shift()!
      current--

      rot(i - 1, j)
      rot(i + 1, j)
      rot(i, j - 1)
      rot(i, j + 1)
    }

    count++
  }

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (grid[i][j] === 1) return -1
    }
  }

  return count
}

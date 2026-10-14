// classical topological sort
function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  const graph: number[][] = Array.from({ length: numCourses }, () => [])

  for (const [course, pre] of prerequisites) {
    graph[pre].push(course)
  }

  /**
   * 0: unvisited
   * 1: visiting
   * 2: visited
   */
  const state = Array(numCourses).fill(0)

  function dfs(course: number): boolean {
    // cycle detected
    if (state[course] === 1) return false
    if (state[course] === 2) return true

    state[course] = 1
    for (const next of graph[course]) {
      if (!dfs(next)) return false
    }
    state[course] = 2
    return true
  }

  for (let i = 0; i < numCourses; i++) {
    if (!dfs(i)) return false
  }

  return true
}

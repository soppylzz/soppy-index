/**
 * Kahn: peel indegree-0 nodes layer by layer; empty result means a cycle, O(V + E)
 * https://leetcode.cn/problems/course-schedule-ii/
 */
function kahnTopo(n: number, edges: number[][]): number[] {
  const graph: number[][] = Array.from({ length: n }, () => [])
  const indegree = new Array(n).fill(0)
  for (const [from, to] of edges) {
    graph[from].push(to)
    indegree[to]++
  }
  const queue: number[] = []
  for (let i = 0; i < n; i++) {
    if (indegree[i] === 0) queue.push(i)
  }
  const order: number[] = []
  for (let head = 0; head < queue.length; head++) {
    const node = queue[head]
    order.push(node)
    for (const next of graph[node]) {
      if (--indegree[next] === 0) queue.push(next)
    }
  }
  return order.length === n ? order : []
}

/**
 * DFS reverse postorder with three-color cycle detection; empty result means a cycle
 * https://leetcode.cn/problems/course-schedule-ii/
 */
function dfsTopo(n: number, edges: number[][]): number[] {
  const graph: number[][] = Array.from({ length: n }, () => [])
  for (const [from, to] of edges) graph[from].push(to)
  const UNVISITED = 0
  const VISITING = 1
  const DONE = 2
  const state = new Array(n).fill(UNVISITED)
  const post: number[] = []
  const dfs = (node: number): boolean => {
    if (state[node] === VISITING) return false
    if (state[node] === DONE) return true
    state[node] = VISITING
    for (const next of graph[node]) {
      if (!dfs(next)) return false
    }
    state[node] = DONE
    post.push(node)
    return true
  }
  for (let i = 0; i < n; i++) {
    if (!dfs(i)) return []
  }
  return post.reverse()
}

/**
 * whether all courses can be finished, i.e. the prerequisite graph has no cycle
 * https://leetcode.cn/problems/course-schedule/
 */
function canFinish(numCourses: number, prerequisites: number[][]): boolean {
  const edges = prerequisites.map(([course, prereq]) => [prereq, course])
  return kahnTopo(numCourses, edges).length === numCourses
}

/* ==================== demo ==================== */
const edges = [
  [0, 1],
  [0, 2],
  [1, 3],
  [2, 3],
]
console.log(kahnTopo(4, edges))
console.log(dfsTopo(4, edges))
console.log(canFinish(2, [[1, 0]]))
console.log(
  canFinish(2, [
    [1, 0],
    [0, 1],
  ])
)
const cyclic = [
  [0, 1],
  [1, 2],
  [2, 0],
]
console.log(kahnTopo(3, cyclic))
console.log(dfsTopo(3, cyclic))

export {}

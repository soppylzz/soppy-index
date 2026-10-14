import { TreeNode } from "./treeNode"

// thanks gpt, you're a really good teacher
function pathSum(root: TreeNode | null, targetSum: number): number {
  // tip: like subString/560.subarraySum (gpt tip)

  let count = 0,
    currentSum = 0

  // cache of prevSum -> count
  const cache = new Map<number, number>()
  cache.set(0, 1)

  function dfs(tree: TreeNode | null) {
    if (tree === null) return

    currentSum += tree.val
    const need = currentSum - targetSum
    if (cache.has(need)) {
      count += cache.get(need)!
    }

    cache.set(currentSum, (cache.get(currentSum) ?? 0) + 1)

    dfs(tree.left)
    dfs(tree.right)

    cache.set(currentSum, cache.get(currentSum)! - 1)
    currentSum -= tree.val
  }

  dfs(root)

  return count
}

import { TreeNode } from "./treeNode"

function lowestCommonAncestor(
  root: TreeNode | null,
  p: TreeNode | null,
  q: TreeNode | null
): TreeNode | null {
  let result: TreeNode | null = null
  function dfs(tree: TreeNode | null): number {
    if (tree === null) return 0

    const left = dfs(tree.left)
    const right = dfs(tree.right)

    if (tree === p || tree === q) {
      if (left + right + 1 === 2) {
        result = tree
        return 0
      } else {
        return 1
      }
    }

    if (left + right === 2) {
      result = tree
      // consume the recursion result so it is not propagated upward
      return 0
    }
    return left + right
  }

  dfs(root)
  return result
}

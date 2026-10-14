import { TreeNode } from "./treeNode"

function maxDepth(root: TreeNode | null): number {
  let currentDepth = 0,
    maxDepth = 0

  function traverse(tree: TreeNode | null) {
    if (tree === null) return

    currentDepth++
    maxDepth = Math.max(maxDepth, currentDepth)

    traverse(tree.left)
    traverse(tree.right)
    currentDepth--
  }

  traverse(root)
  return maxDepth
}

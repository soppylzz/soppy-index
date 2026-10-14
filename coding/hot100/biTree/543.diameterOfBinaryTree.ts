import { TreeNode } from "./treeNode"

function diameterOfBinaryTree(root: TreeNode | null): number {
  if (root === null) return 0

  let diameter = 0
  function maxDepth(tree: TreeNode | null): number {
    if (tree === null) return 0

    const left = maxDepth(tree.left)
    const right = maxDepth(tree.right)

    diameter = Math.max(diameter, left + right)

    return 1 + Math.max(left, right)
  }

  maxDepth(root)

  return diameter
}

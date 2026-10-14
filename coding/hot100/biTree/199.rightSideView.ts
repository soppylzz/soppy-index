import { TreeNode } from "./treeNode"

// solution: 1) LRT traversal 2) complete binary tree
function rightSideView(root: TreeNode | null): number[] {
  const result: number[] = []

  let depth = 0

  function traverse(tree: TreeNode | null) {
    if (tree === null) return

    depth++
    traverse(tree.left)
    traverse(tree.right)
    depth--
    result[depth] = tree.val
  }

  traverse(root)

  return result
}

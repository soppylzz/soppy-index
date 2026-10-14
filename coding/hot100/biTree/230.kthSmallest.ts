import { TreeNode } from "./treeNode"

function kthSmallest(root: TreeNode | null, k: number): number {
  let count = 0,
    result: number = 0
  function traverse(tree: TreeNode | null) {
    if (tree === null) return
    if (count === k) return

    traverse(tree.left)
    count++

    if (count === k) result = tree.val

    traverse(tree.right)
  }

  traverse(root)

  return result
}

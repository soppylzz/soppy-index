import { TreeNode } from "./treeNode"

function isValidBST(root: TreeNode | null): boolean {
  let prev = -Infinity
  let result = true

  function traverse(tree: TreeNode | null) {
    if (!result) return
    if (tree === null) return

    traverse(tree.left)
    if (prev < tree.val) {
      prev = tree.val
    } else {
      result = false
      return
    }
    traverse(tree.right)
    return true
  }

  traverse(root)

  return result
}

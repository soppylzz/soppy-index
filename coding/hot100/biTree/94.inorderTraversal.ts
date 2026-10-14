import { TreeNode } from "./treeNode"

// solution: 1) recursion 2) iteration!
function inorderTraversalRecursion(root: TreeNode | null): number[] {
  const result: number[] = []
  function traverse(root: TreeNode | null) {
    if (root === null) return

    traverse(root.left)
    result.push(root.val)
    traverse(root.right)
  }

  traverse(root)

  return result
}

function inorderTraversal(root: TreeNode | null): number[] {
  const result: number[] = []
  const stack: TreeNode[] = []

  let current = root

  while (current !== null || stack.length > 0) {
    while (current !== null) {
      stack.push(current)
      current = current.left
    }

    current = stack.pop()!
    result.push(current.val)
    current = current.right
  }

  return result
}

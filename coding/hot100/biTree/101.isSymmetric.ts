import { TreeNode } from "./treeNode"

function isSymmetric(root: TreeNode | null): boolean {
  if (root === null) return true

  const one: (TreeNode | null)[] = [root.left]
  const another: (TreeNode | null)[] = [root.right]

  while (one.length) {
    const lNode: TreeNode | null = one.shift()!
    const rNode: TreeNode | null = another.shift()!

    if (lNode === null && rNode === null) continue
    if (lNode === null || rNode === null) return false
    if (lNode.val !== rNode.val) return false

    one.push(lNode.left)
    another.push(rNode.right)

    one.push(lNode.right)
    another.push(rNode.left)
  }

  return true
}

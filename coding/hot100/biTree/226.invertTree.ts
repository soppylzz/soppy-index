import { TreeNode } from "./treeNode"

function invertTree(root: TreeNode | null): TreeNode | null {
  if (root === null) return null

  const queue: TreeNode[] = [root]

  while (queue.length) {
    const head: TreeNode = queue.shift()!
    ;[head.left, head.right] = [head.right, head.left]

    if (head.left) queue.push(head.left)
    if (head.right) queue.push(head.right)
  }

  return root
}

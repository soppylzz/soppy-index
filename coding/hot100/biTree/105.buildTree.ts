import { TreeNode } from "./treeNode"

function buildTree(preorder: number[], inorder: number[]): TreeNode | null {
  if (preorder.length === 0) return null

  const cache = new Map<number, number>()
  for (let i = 0; i < inorder.length; i++) cache.set(inorder[i], i)

  function traverse(
    preStart: number,
    preEnd: number,
    inStart: number,
    inEnd: number
  ): TreeNode | null {
    if (preStart >= preEnd) return null
    const tree = new TreeNode(preorder[preStart])

    const inorderSep = cache.get(tree.val)!

    // light: no need to find preorderSep manually
    const leftSize = inorderSep - inStart
    const preorderSep = preStart + 1 + leftSize

    const left = traverse(preStart + 1, preorderSep, inStart, inorderSep)
    const right = traverse(preorderSep, preEnd, inorderSep + 1, inEnd)

    tree.left = left
    tree.right = right

    return tree
  }

  return traverse(0, preorder.length, 0, inorder.length)
}

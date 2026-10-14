import { TreeNode } from "./treeNode"

function maxPathSum(root: TreeNode | null): number {
  // think: like 543.diameterOfBinaryTree? yes

  let maxSum = -Infinity
  function dfs(tree: TreeNode | null): number {
    if (tree === null) return 0

    const left = dfs(tree.left)
    const right = dfs(tree.right)

    const curSum = left + right + tree.val
    maxSum = Math.max(maxSum, curSum)

    // return the max arm value to the parent
    return Math.max(0, tree.val + right, tree.val + left, tree.val)
  }

  dfs(root)
  return maxSum
}

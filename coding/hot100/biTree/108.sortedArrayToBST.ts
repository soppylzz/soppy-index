import { TreeNode } from "./treeNode"

function sortedArrayToBST(nums: number[]): TreeNode | null {
  function traverse(start: number, end: number): TreeNode | null {
    if (start >= end) return null

    const mid = (start + end) >> 1
    const node = new TreeNode(nums[mid])
    node.left = traverse(start, mid)
    node.right = traverse(mid + 1, end)
    return node
  }

  return traverse(0, nums.length)
}

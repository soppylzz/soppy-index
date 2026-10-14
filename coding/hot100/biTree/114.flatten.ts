import { TreeNode } from "./treeNode"

function flatten(root: TreeNode | null): void {
  function traverse(tree: TreeNode | null): { start: TreeNode; end: TreeNode } | null {
    if (tree === null) return null

    const left = tree.left
    const right = tree.right

    const start = tree
    let res, end

    tree.left = null
    res = traverse(left)
    if (res) {
      tree.right = res.start
      end = res.end
    } else {
      end = tree
    }

    res = traverse(right)
    if (res) {
      end.right = res.start
      end = res.end
    }

    return { start, end }
  }

  traverse(root)
}

import { useState } from "react"

export interface TreeNode {
  id: string
  label: string
  children?: TreeNode[]
}

export function Tree({ nodes }: { nodes: TreeNode[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  function toggle(id: string) {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function renderNodes(items: TreeNode[]) {
    return (
      <ul>
        {items.map((node) => {
          const branch = Boolean(node.children?.length)
          return (
            <li key={node.id}>
              {branch ? (
                <button aria-expanded={expanded.has(node.id)} onClick={() => toggle(node.id)}>
                  {node.label}
                </button>
              ) : (
                <span>{node.label}</span>
              )}
              {branch && expanded.has(node.id) && renderNodes(node.children!)}
            </li>
          )
        })}
      </ul>
    )
  }
  return <nav aria-label="Topic outline">{renderNodes(nodes)}</nav>
}

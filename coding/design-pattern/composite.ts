export type MenuView =
  | { kind: "item"; label: string; path: string }
  | { kind: "group"; label: string; children: MenuView[] }

export interface MenuNode {
  toView(permissions: ReadonlySet<string>): MenuView | null
}

export class MenuItem implements MenuNode {
  private label: string
  private path: string
  private permission: string | undefined

  constructor(label: string, path: string, permission?: string) {
    this.label = label
    this.path = path
    this.permission = permission
  }

  toView(permissions: ReadonlySet<string>): MenuView | null {
    if (this.permission !== undefined && !permissions.has(this.permission)) return null
    return { kind: "item", label: this.label, path: this.path }
  }
}

export class MenuGroup implements MenuNode {
  private label: string
  private children: readonly MenuNode[]

  constructor(label: string, children: readonly MenuNode[]) {
    this.label = label
    this.children = [...children]
  }

  toView(permissions: ReadonlySet<string>): MenuView | null {
    const children: MenuView[] = []
    for (const node of this.children) {
      const view = node.toView(permissions)
      if (view !== null) children.push(view)
    }
    return children.length > 0 ? { kind: "group", label: this.label, children } : null
  }
}

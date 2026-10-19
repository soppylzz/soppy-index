import { describe, expect, it } from "vitest"
import { MenuGroup, MenuItem } from "../composite.ts"

describe("menu composite", () => {
  it("treats leaves and nested groups through the same interface", () => {
    const menu = new MenuGroup("Root", [
      new MenuItem("Home", "/"),
      new MenuGroup("Admin", [new MenuItem("Users", "/users", "users:read")]),
    ])
    expect(menu.toView(new Set())).toEqual({
      kind: "group",
      label: "Root",
      children: [{ kind: "item", label: "Home", path: "/" }],
    })
    const visible = menu.toView(new Set(["users:read"]))
    expect(visible?.kind).toBe("group")
    if (visible?.kind === "group") expect(visible.children).toHaveLength(2)
  })
  it("prunes empty groups and takes a snapshot of child membership", () => {
    const children: MenuItem[] = []
    const group = new MenuGroup("Empty", children)
    children.push(new MenuItem("Late", "/late"))
    expect(group.toView(new Set())).toBeNull()
  })
})

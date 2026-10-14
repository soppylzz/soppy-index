import type { Expression, Node, Program } from "./model.ts"
export function children(node: Node): Node[] {
  switch (node.kind) {
    case "Program":
      return node.statements
    case "Variable":
      return [node.name, ...(node.annotation ? [node.annotation] : []), node.init]
    case "ExpressionStatement":
      return [node.expression]
    case "Import":
    case "Require":
      return [...node.names, node.path]
    case "ExportAssignment":
      return [node.name]
    case "Arrow":
      return [...node.params, ...(node.annotation ? [node.annotation] : []), node.body]
    case "Function":
      return [...node.params, node.body]
    case "Parameter":
      return [node.name, ...(node.annotation ? [node.annotation] : [])]
    case "Binary":
      return [node.left, node.right]
    case "Call":
      return [node.callee, ...node.args]
    case "Member":
      return [node.object, node.property]
    case "Group":
      return [node.expression]
    default:
      return []
  }
}
export function walk(node: Node, visit: (node: Node) => void): void {
  visit(node)
  children(node).forEach((child) => walk(child, visit))
}
/** A bottom-up immutable traversal; identifiers may be declarations or references, unlike binder reference visits. */
export function rewrite(program: Program, pass: (node: Node) => Node): Program {
  function transform(node: Node): Node {
    let result: Node = { ...node }
    const expr = (value: Expression) => transform(value) as Expression
    switch (node.kind) {
      case "Program":
        result = { ...node, statements: node.statements.map((s) => transform(s) as typeof s) }
        break
      case "Variable":
        result = { ...node, init: expr(node.init) }
        break
      case "ExpressionStatement":
        result = { ...node, expression: expr(node.expression) }
        break
      case "Arrow":
      case "Function":
        result = {
          ...node,
          params: node.params.map((p) => transform(p) as typeof p),
          body: expr(node.body),
        }
        break
      case "Binary":
        result = { ...node, left: expr(node.left), right: expr(node.right) }
        break
      case "Call":
        result = { ...node, callee: expr(node.callee), args: node.args.map(expr) }
        break
      case "Group":
        result = { ...node, expression: expr(node.expression) }
        break
    }
    return pass(result)
  }
  return transform(program) as Program
}

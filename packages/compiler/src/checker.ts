import {
  diagnostic,
  typeName,
  type Diagnostic,
  type Expression,
  type Program,
  type Source,
  type Type,
} from "./model.ts"
import type { BindResult } from "./binder.ts"
export interface CheckResult {
  types: Map<Expression, Type>
  diagnostics: Diagnostic[]
}
function equal(left: Type, right: Type): boolean {
  if (typeof left === "string" || typeof right === "string") return left === right
  return (
    left.params.length === right.params.length &&
    left.params.every((p, i) => equal(p, right.params[i])) &&
    equal(left.result, right.result)
  )
}
/** Teaching counterpart of createTypeChecker, without structural relations or flow analysis. Types are attached to original expressions and bound symbols, never inferred from emitted text. */
export function check(
  source: Source,
  program: Program,
  binding: BindResult,
  language: "ts" | "js" = "ts"
): CheckResult {
  const result: CheckResult = { types: new Map(), diagnostics: [] }
  function report(node: Expression, code: string, message: string): void {
    result.diagnostics.push(diagnostic(source, node, "checker", code, message))
  }
  function expect(node: Expression, actual: Type, expected: Type, code: string): void {
    if (actual !== "unknown" && expected !== "unknown" && !equal(actual, expected))
      report(node, code, `Expected ${typeName(expected)}, received ${typeName(actual)}`)
  }
  function expression(node: Expression): Type {
    let type: Type = "unknown"
    switch (node.kind) {
      case "Literal":
        type = typeof node.value as "string" | "number" | "boolean"
        break
      case "Identifier":
        type = binding.references.get(node)?.type ?? "unknown"
        break
      case "Group":
        type = expression(node.expression)
        break
      case "Member":
        type = { kind: "function", params: [], result: "void", variadic: true }
        break
      case "Binary": {
        const left = expression(node.left),
          right = expression(node.right)
        if ((left === "number" || left === "string") && left === right) type = left
        else if (left !== "unknown" && right !== "unknown")
          report(node, "T005", "'+' requires number + number or string + string")
        break
      }
      case "Arrow":
      case "Function": {
        const body = expression(node.body)
        const declared = node.kind === "Arrow" ? node.annotation?.name : undefined
        if (declared) expect(node.body, body, declared, "T004")
        type = {
          kind: "function",
          params: node.params.map((p) => p.annotation?.name ?? "unknown"),
          result: declared ?? body,
        }
        break
      }
      case "Call": {
        const callee = expression(node.callee),
          args = node.args.map(expression)
        if (language === "js")
          args.forEach((arg, i) => {
            if (typeof arg !== "string")
              report(
                node.args[i],
                "T003",
                "JS mode only accepts primitive function arguments; callback inference is unsupported"
              )
          })
        if (typeof callee !== "string") {
          if (callee.variadic) {
            args.forEach((arg, i) => {
              if (
                !["string", "number", "boolean", "unknown"].includes(
                  typeof arg === "string" ? arg : "function"
                )
              )
                report(node.args[i], "T003", "console.log accepts primitive values only")
            })
          } else {
            if (args.length !== callee.params.length)
              report(
                node,
                "T002",
                `Expected ${callee.params.length} arguments, received ${args.length}`
              )
            args.forEach((arg, i) => {
              if (callee.params[i]) expect(node.args[i], arg, callee.params[i], "T003")
            })
          }
          type = callee.result
        } else if (callee !== "unknown" || language === "js")
          report(node.callee, "T006", `Value of type ${callee} is not callable in this subset`)
        break
      }
    }
    result.types.set(node, type)
    return type
  }
  for (const statement of program.statements) {
    if (statement.kind === "Variable") {
      const actual = expression(statement.init)
      if (statement.annotation) expect(statement.init, actual, statement.annotation.name, "T001")
      binding.declarations.get(statement.name)!.type = statement.annotation?.name ?? actual
    }
    if (statement.kind === "ExpressionStatement") expression(statement.expression)
  }
  return result
}

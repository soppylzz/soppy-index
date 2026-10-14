import {
  fail,
  type CompileOptions,
  type Node,
  type Program,
  type Source,
  type Statement,
} from "./model.ts"
import { rewrite, walk } from "./visitor.ts"
export function eraseTypes(program: Program): Program {
  return rewrite(program, (node) => {
    if (node.kind === "Variable" || node.kind === "Arrow" || node.kind === "Parameter")
      return { ...node, annotation: undefined }
    return node
  })
}
export function lowerArrows(program: Program): Program {
  return rewrite(program, (node) =>
    node.kind === "Arrow"
      ? {
          kind: "Function",
          params: node.params,
          body: node.body,
          start: node.start,
          end: node.end,
          origin: node.origin ?? node,
        }
      : node
  )
}
/** Binder must reject all forward captures and recursion first. No blocks, writes, loops or reflection exist in the source subset. */
export function lowerConstants(program: Program): Program {
  return rewrite(program, (node) =>
    node.kind === "Variable"
      ? { ...node, declarationKind: "var", origin: node.origin ?? node }
      : node
  )
}
export function convertModules(source: Source, program: Program): Program {
  walk(program, (node) => {
    if (
      node.kind === "Identifier" &&
      ["require", "module", "exports", "Object"].includes(node.name)
    )
      fail(
        source,
        node,
        "modules",
        "M008",
        `CJS runtime name '${node.name}' is reserved in CJS output`
      )
  })
  const statements: Statement[] = []
  for (const statement of program.statements) {
    if (statement.kind === "Import")
      statements.push({ ...statement, kind: "Require", origin: statement })
    else if (statement.kind === "Variable" && statement.exported) {
      statements.push({ ...statement, exported: false })
      statements.push({
        kind: "ExportAssignment",
        name: { ...statement.name, origin: statement.name },
        start: statement.start,
        end: statement.end,
      })
    } else statements.push(statement)
  }
  return { ...program, statements }
}
export interface TransformResult {
  program: Program
  passes: { name: string; program: Program }[]
}
export function transform(
  source: Source,
  original: Program,
  options: CompileOptions,
  resolvePath?: (path: string) => string
): TransformResult {
  let program = eraseTypes(original)
  const passes = [{ name: "erase-types", program }]
  function apply(name: string, run: (input: Program) => Program): void {
    program = run(program)
    passes.push({ name, program })
  }
  if (options.target === "legacy") {
    apply("lower-arrows", lowerArrows)
    apply("lower-constants", lowerConstants)
  }
  if (resolvePath)
    apply("rewrite-module-paths", (input) =>
      rewrite(input, (node: Node) =>
        node.kind === "Import"
          ? {
              ...node,
              path: {
                ...node.path,
                value: resolvePath(String(node.path.value)),
                origin: node.path,
              },
            }
          : node
      )
    )
  if (options.format === "cjs") apply("esm-to-cjs", (input) => convertModules(source, input))
  return { program, passes }
}

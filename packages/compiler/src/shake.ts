import type { BindingSymbol } from "./binder.ts"
import type { Module, ModuleGraph } from "./modules.ts"
import type { Expression, Program, Statement } from "./model.ts"
import { walk } from "./visitor.ts"
/** Pure means evaluation cannot call user code. Arrow bodies are deferred; '+' is safe only after TS checking. JS '+' stays conservative. */
export function isPure(node: Expression, language: "ts" | "js" = "ts"): boolean {
  switch (node.kind) {
    case "Literal":
    case "Identifier":
    case "Arrow":
    case "Function":
      return true
    case "Group":
      return isPure(node.expression, language)
    case "Binary":
      return language === "ts" && isPure(node.left, language) && isPure(node.right, language)
    default:
      return false
  }
}
export interface ShakeReport {
  file: string
  name: string
  action: "keep" | "drop"
  reason: string
}
export interface ShakeResult {
  programs: Map<string, Program>
  report: ShakeReport[]
}
/** Teaching counterpart of Rollup Graph.includeStatements. Worklist reaches a fixed point across local bindings and import/export edges; every retained initializer/body contributes references. */
export function shake(graph: ModuleGraph, entryExports: string[] = []): ShakeResult {
  const retained = new Set<Statement>(),
    used = new Set<BindingSymbol>(),
    reasons = new Map<Statement, string>()
  const queue: { module: Module; statement: Statement }[] = []
  function keep(module: Module, statement: Statement, reason: string): void {
    if (retained.has(statement)) return
    retained.add(statement)
    reasons.set(statement, reason)
    queue.push({ module, statement })
  }
  function use(module: Module, symbol: BindingSymbol): void {
    if (used.has(symbol)) return
    used.add(symbol)
    if (symbol.kind === "variable" && symbol.declaration?.kind === "Variable")
      keep(module, symbol.declaration, `Referenced binding '${symbol.name}'`)
    if (symbol.kind === "import" && symbol.declaration?.kind === "Import") {
      const file = module.dependencies.get(symbol.declaration)!,
        dependency = graph.modules.get(file)!
      use(dependency, dependency.analysis.binding.exports.get(symbol.name)!)
    }
  }
  for (const module of graph.modules.values())
    for (const statement of module.analysis.ast.statements) {
      if (statement.kind === "ExpressionStatement")
        keep(module, statement, "Module execution statement")
      if (
        statement.kind === "Variable" &&
        !isPure(statement.init, module.file.endsWith(".js") ? "js" : "ts")
      )
        keep(module, statement, "Initializer may have side effects")
    }
  const entry = graph.modules.get(graph.entry)!
  for (const name of entryExports) {
    const symbol = entry.analysis.binding.exports.get(name)
    if (!symbol) throw new Error(`Unknown entry export '${name}'`)
    use(entry, symbol)
  }
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const { module, statement } = queue[cursor]
    walk(statement, (node) => {
      if (node.kind === "Identifier") {
        const symbol = module.analysis.binding.references.get(node)
        if (symbol) use(module, symbol)
      }
    })
  }
  const result: ShakeResult = { programs: new Map(), report: [] }
  for (const module of graph.modules.values()) {
    const statements: Statement[] = []
    result.report.push({
      file: module.file,
      name: "<module>",
      action: "keep",
      reason:
        module.file === graph.entry
          ? "Entry execution"
          : "Static dependency evaluation; preserve order (including empty module shells)",
    })
    for (const statement of module.analysis.ast.statements) {
      if (statement.kind === "Import") {
        const names = statement.names.filter((name) =>
          used.has(module.analysis.binding.declarations.get(name)!)
        )
        statements.push({ ...statement, names })
        for (const name of statement.names)
          result.report.push({
            file: module.file,
            name: `import ${name.name}`,
            action: names.includes(name) ? "keep" : "drop",
            reason: names.includes(name)
              ? "Referenced imported symbol"
              : "Unused import binding; evaluation edge preserved",
          })
      } else {
        const kept = retained.has(statement)
        if (kept) statements.push(statement)
        result.report.push({
          file: module.file,
          name:
            statement.kind === "Variable"
              ? statement.name.name
              : `<statement:${statement.start.line + 1}>`,
          action: kept ? "keep" : "drop",
          reason: reasons.get(statement) ?? "Unused declaration with proven pure initializer",
        })
      }
    }
    result.programs.set(module.file, { ...module.analysis.ast, statements })
  }
  return result
}

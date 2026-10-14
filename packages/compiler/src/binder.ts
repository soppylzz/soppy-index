import {
  diagnostic,
  type Diagnostic,
  type Expression,
  type Identifier,
  type Import,
  type Parameter,
  type Program,
  type Source,
  type Type,
  type Variable,
} from "./model.ts"
export interface BindingSymbol {
  id: number
  name: string
  kind: "variable" | "parameter" | "import" | "builtin"
  declaration?: Variable | Parameter | Import
  type?: Type
}
export interface Scope {
  id: number
  parent?: Scope
  symbols: Map<string, BindingSymbol>
}
export interface BindResult {
  scopes: Scope[]
  references: Map<Identifier, BindingSymbol>
  declarations: Map<Identifier, BindingSymbol>
  exports: Map<string, BindingSymbol>
  diagnostics: Diagnostic[]
}
/** Teaching counterpart of bindSourceFile; TDZ policy is intentionally stricter. Predeclare names to detect TDZ/recursion, then bind in source order. Even deferred forward captures are deliberately rejected. */
export function bind(
  source: Source,
  program: Program,
  imported = new Map<string, Type>()
): BindResult {
  const result: BindResult = {
    scopes: [],
    references: new Map(),
    declarations: new Map(),
    exports: new Map(),
    diagnostics: [],
  }
  let symbolId = 0
  function scope(parent?: Scope): Scope {
    const value = { id: result.scopes.length, parent, symbols: new Map<string, BindingSymbol>() }
    result.scopes.push(value)
    return value
  }
  const moduleScope = scope()
  const ready = new Set<BindingSymbol>()
  const builtin: BindingSymbol = {
    id: symbolId++,
    name: "console",
    kind: "builtin",
    type: "console",
  }
  moduleScope.symbols.set("console", builtin)
  ready.add(builtin)
  function declare(
    name: Identifier,
    owner: Scope,
    kind: BindingSymbol["kind"],
    declaration: BindingSymbol["declaration"]
  ): BindingSymbol {
    if (owner.symbols.has(name.name) || name.name === "console")
      result.diagnostics.push(
        diagnostic(
          source,
          name,
          "binder",
          "B001",
          `Duplicate or reserved declaration '${name.name}'`
        )
      )
    const symbol: BindingSymbol = { id: symbolId++, name: name.name, kind, declaration }
    owner.symbols.set(name.name, symbol)
    result.declarations.set(name, symbol)
    return symbol
  }
  for (const statement of program.statements) {
    if (statement.kind === "Variable") {
      const symbol = declare(statement.name, moduleScope, "variable", statement)
      if (statement.exported) result.exports.set(symbol.name, symbol)
    }
    if (statement.kind === "Import")
      for (const name of statement.names) {
        const symbol = declare(name, moduleScope, "import", statement)
        symbol.type = imported.get(name.name)
        if (!symbol.type)
          result.diagnostics.push(
            diagnostic(
              source,
              name,
              "binder",
              "B004",
              `Import '${name.name}' requires module graph resolution`
            )
          )
        ready.add(symbol)
      }
  }
  function reference(name: Identifier, owner: Scope): void {
    let current: Scope | undefined = owner
    let symbol: BindingSymbol | undefined
    while (current && !symbol) {
      symbol = current.symbols.get(name.name)
      current = current.parent
    }
    if (!symbol)
      result.diagnostics.push(
        diagnostic(source, name, "binder", "B002", `Undeclared identifier '${name.name}'`)
      )
    else {
      result.references.set(name, symbol)
      if (!ready.has(symbol))
        result.diagnostics.push(
          diagnostic(
            source,
            name,
            "binder",
            "B003",
            `Forward reference, TDZ access or recursion is unsupported: '${name.name}'`
          )
        )
    }
  }
  function expression(node: Expression, owner: Scope): void {
    switch (node.kind) {
      case "Identifier":
        reference(node, owner)
        break
      case "Member":
        reference(node.object, owner)
        break
      case "Binary":
        expression(node.left, owner)
        expression(node.right, owner)
        break
      case "Call":
        expression(node.callee, owner)
        node.args.forEach((arg) => expression(arg, owner))
        break
      case "Group":
        expression(node.expression, owner)
        break
      case "Arrow":
      case "Function": {
        const local = scope(owner)
        for (const parameter of node.params) {
          const symbol = declare(parameter.name, local, "parameter", parameter)
          symbol.type = parameter.annotation?.name ?? "unknown"
          ready.add(symbol)
        }
        expression(node.body, local)
        break
      }
    }
  }
  for (const statement of program.statements) {
    if (statement.kind === "Variable") {
      expression(statement.init, moduleScope)
      ready.add(result.declarations.get(statement.name)!)
    }
    if (statement.kind === "ExpressionStatement") expression(statement.expression, moduleScope)
  }
  return result
}
export function symbolTable(binding: BindResult): unknown {
  return binding.scopes.map((s) => ({
    scope: s.id,
    parent: s.parent?.id,
    symbols: [...s.symbols.values()].map((symbol) => ({
      id: symbol.id,
      name: symbol.name,
      kind: symbol.kind,
      type: symbol.type,
    })),
  }))
}

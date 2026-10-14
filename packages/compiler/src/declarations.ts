import type { Analysis } from "./compiler.ts"
import { Writer } from "./emitter.ts"
import { fail, type Arrow, type Expression, type Type } from "./model.ts"
function unwrap(node: Expression): Expression {
  return node.kind === "Group" ? unwrap(node.expression) : node
}
/** Teaching counterpart of transformDeclarations, without complex type serialization. Declaration text is derived from checked export symbols. Only names/parameters have exact source mappings. */
export function emitDeclarations(analysis: Analysis, file: string) {
  const writer = new Writer(analysis.source, file)
  function printType(type: Type): void {
    if (typeof type === "string" && ["string", "number", "boolean", "void"].includes(type))
      writer.write(type)
    else
      fail(
        analysis.source,
        analysis.ast,
        "declaration",
        "D001",
        "Export type cannot be represented by this declaration subset"
      )
  }
  for (const [name, symbol] of analysis.binding.exports) {
    const declaration = symbol.declaration
    if (!declaration || declaration.kind !== "Variable" || !symbol.type) continue
    writer.write("export declare const ")
    writer.write(name, declaration.name, name)
    writer.write(": ")
    if (typeof symbol.type === "string") printType(symbol.type)
    else {
      const signature = symbol.type
      const init = unwrap(declaration.init)
      if (init.kind !== "Arrow")
        fail(
          analysis.source,
          declaration,
          "declaration",
          "D002",
          "Function declarations require a directly exported arrow initializer"
        )
      const arrow: Arrow = init
      writer.write("(")
      arrow.params.forEach((param, i) => {
        if (i) writer.write(", ")
        writer.write(param.name.name, param.name, param.name.name)
        writer.write(": ")
        printType(signature.params[i])
      })
      writer.write(") => ")
      printType(signature.result)
    }
    writer.write(";\n")
  }
  if (!analysis.binding.exports.size) writer.write("export {};\n")
  return writer.finish()
}

import { GenMapping, addSegment, setSourceContent, toEncodedMap } from "@jridgewell/gen-mapping"
import { basename } from "node:path"
import type { Expression, Program, Source, Span, Statement } from "./model.ts"
export type SourceMap = ReturnType<typeof toEncodedMap>
/** Teaching counterpart of createPrinter/createSourceMapGenerator. The printer owns generated positions; the mapping library only serializes collected segments. Synthetic text is explicitly unmapped. */
export class Writer {
  code = ""
  line = 0
  column = 0
  source: Source
  mapping: GenMapping
  constructor(source: Source, file: string) {
    this.source = source
    this.mapping = new GenMapping({ file })
    setSourceContent(this.mapping, source.file, source.text)
  }
  write(text: string, origin?: Span, name?: string): void {
    if (!text) return
    if (origin) {
      if (name)
        addSegment(
          this.mapping,
          this.line,
          this.column,
          this.source.file,
          origin.start.line,
          origin.start.column,
          name
        )
      else
        addSegment(
          this.mapping,
          this.line,
          this.column,
          this.source.file,
          origin.start.line,
          origin.start.column
        )
    } else addSegment(this.mapping, this.line, this.column)
    this.code += text
    for (const char of text.split("")) {
      if (char === "\n") {
        this.line++
        this.column = 0
      } else this.column++
    }
  }
  finish(comment = true): { code: string; map: SourceMap } {
    const map = toEncodedMap(this.mapping)
    if (comment) this.write(`//# sourceMappingURL=${basename(map.file!)}.map\n`)
    return { code: this.code, map }
  }
}
export function emit(
  source: Source,
  program: Program,
  file = "output.js",
  comment = true
): { code: string; map: SourceMap } {
  const writer = new Writer(source, file)
  const w = (text: string, origin?: Span, name?: string) => writer.write(text, origin, name)
  function expression(node: Expression): void {
    const origin = node.origin ?? node
    switch (node.kind) {
      case "Identifier":
        w(node.name, origin, node.name)
        break
      case "Literal":
        w(
          JSON.stringify(node.value)
            .replace(/\u2028/g, "\\u2028")
            .replace(/\u2029/g, "\\u2029"),
          origin
        )
        break
      case "Group":
        w("(", origin)
        expression(node.expression)
        w(")")
        break
      case "Binary":
        w("(", origin)
        expression(node.left)
        w(" + ")
        expression(node.right)
        w(")")
        break
      case "Member":
        expression(node.object)
        w(".")
        expression(node.property)
        break
      case "Call":
        w("(")
        expression(node.callee)
        w(")(")
        node.args.forEach((arg, i) => {
          if (i) w(", ")
          expression(arg)
        })
        w(")")
        break
      case "Arrow":
      case "Function": {
        w(node.kind === "Arrow" ? "(" : "function (")
        node.params.forEach((p, i) => {
          if (i) w(", ")
          expression(p.name)
        })
        w(node.kind === "Arrow" ? ") => " : ") { return ")
        expression(node.body)
        if (node.kind === "Function") w("; }")
        break
      }
    }
  }
  function statement(node: Statement): void {
    switch (node.kind) {
      case "Variable":
        if (node.exported) w("export ")
        w(`${node.declarationKind} `)
        expression(node.name)
        w(" = ")
        expression(node.init)
        w(";\n")
        break
      case "ExpressionStatement":
        w("(")
        expression(node.expression)
        w(");\n")
        break
      case "Import":
        w("import ")
        if (node.names.length) {
          w("{ ")
          node.names.forEach((name, i) => {
            if (i) w(", ")
            expression(name)
          })
          w(" } from ")
        }
        expression(node.path)
        w(";\n")
        break
      case "Require":
        if (!node.names.length) {
          w("require(")
          expression(node.path)
          w(");\n")
        } else
          node.names.forEach((name) => {
            w("var ")
            expression(name)
            w(" = require(")
            expression(node.path)
            w(")[")
            w(JSON.stringify(name.name))
            w("];\n")
          })
        break
      case "ExportAssignment":
        w("Object.defineProperty(exports, ")
        w(JSON.stringify(node.name.name))
        w(", { enumerable: true, value: ")
        expression(node.name)
        w(" });\n")
        break
    }
  }
  if (program.statements.some((s) => s.kind === "Require" || s.kind === "ExportAssignment"))
    w('"use strict";\n')
  program.statements.forEach(statement)
  return writer.finish(comment)
}

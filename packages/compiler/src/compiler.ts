import { bind, type BindResult } from "./binder.ts"
import { check, type CheckResult } from "./checker.ts"
import { emit } from "./emitter.ts"
import { scan, type Token } from "./lexer.ts"
import {
  CompileError,
  fail,
  type CompileOptions,
  type Program,
  type Source,
  type Type,
} from "./model.ts"
import { parse } from "./parser.ts"
import { transform } from "./transform.ts"
export interface Analysis {
  source: Source
  tokens: Token[]
  ast: Program
  binding: BindResult
  checking: CheckResult
}
export function analyze(
  source: Source,
  options: CompileOptions = {},
  imported?: Map<string, Type>
): Analysis {
  const tokens = scan(source),
    ast = parse(source, options.language ?? "ts", tokens)
  const unresolvedImport = ast.statements.find((statement) => statement.kind === "Import")
  if (!imported && unresolvedImport)
    fail(
      source,
      unresolvedImport,
      "modules",
      "M006",
      "Imports require loadGraph(); single-file compilation is self-contained"
    )
  const binding = bind(source, ast, imported)
  const checking = check(source, ast, binding, options.language)
  const diagnostics = [...binding.diagnostics, ...checking.diagnostics]
  if (diagnostics.length) throw new CompileError(diagnostics)
  return { source, tokens, ast, binding, checking }
}
export function compile(
  source: Source,
  options: CompileOptions = {},
  file = "output.js",
  comment = true
) {
  const analysis = analyze(source, options)
  const transformed = transform(source, analysis.ast, options)
  return { ...analysis, ...emit(source, transformed.program, file, comment), transformed }
}

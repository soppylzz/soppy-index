export interface Position {
  offset: number
  line: number
  column: number
}
export interface Span {
  start: Position
  end: Position
}
export interface Source {
  file: string
  text: string
}
export type Phase = "lexer" | "parser" | "binder" | "checker" | "modules" | "declaration" | "cli"
export interface Diagnostic extends Span {
  code: string
  phase: Phase
  message: string
  file: string
}
export class CompileError extends Error {
  diagnostics: Diagnostic[]
  constructor(diagnostics: Diagnostic[]) {
    super(
      diagnostics
        .map(
          (d) =>
            `${d.file}:${d.start.line + 1}:${d.start.column + 1} [${d.phase}/${d.code}] ${d.message}`
        )
        .join("\n")
    )
    this.diagnostics = diagnostics
  }
}
export function diagnostic(
  source: Source,
  span: Span,
  phase: Phase,
  code: string,
  message: string
): Diagnostic {
  return { start: span.start, end: span.end, file: source.file, phase, code, message }
}
export function fail(
  source: Source,
  span: Span,
  phase: Phase,
  code: string,
  message: string
): never {
  throw new CompileError([diagnostic(source, span, phase, code, message)])
}
export type Primitive = "string" | "number" | "boolean"
export interface Base extends Span {
  origin?: Span
}
export interface Identifier extends Base {
  kind: "Identifier"
  name: string
}
export interface Annotation extends Base {
  kind: "Annotation"
  name: Primitive
}
export interface Parameter extends Base {
  kind: "Parameter"
  name: Identifier
  annotation?: Annotation
}
export interface Literal extends Base {
  kind: "Literal"
  value: string | number | boolean
}
export interface Binary extends Base {
  kind: "Binary"
  left: Expression
  right: Expression
}
export interface Call extends Base {
  kind: "Call"
  callee: Expression
  args: Expression[]
}
export interface Member extends Base {
  kind: "Member"
  object: Identifier
  property: Identifier
}
export interface Group extends Base {
  kind: "Group"
  expression: Expression
}
export interface Arrow extends Base {
  kind: "Arrow"
  params: Parameter[]
  annotation?: Annotation
  body: Expression
}
export interface FunctionExpression extends Base {
  kind: "Function"
  params: Parameter[]
  body: Expression
}
export type Expression =
  Identifier | Literal | Binary | Call | Member | Group | Arrow | FunctionExpression
export interface Variable extends Base {
  kind: "Variable"
  name: Identifier
  annotation?: Annotation
  init: Expression
  exported: boolean
  declarationKind: "const" | "var"
}
export interface ExpressionStatement extends Base {
  kind: "ExpressionStatement"
  expression: Expression
}
export interface Import extends Base {
  kind: "Import"
  names: Identifier[]
  path: Literal
}
export interface RequireStatement extends Base {
  kind: "Require"
  names: Identifier[]
  path: Literal
}
export interface ExportAssignment extends Base {
  kind: "ExportAssignment"
  name: Identifier
}
export type Statement =
  Variable | ExpressionStatement | Import | RequireStatement | ExportAssignment
export interface Program extends Base {
  kind: "Program"
  statements: Statement[]
}
export type Node = Program | Statement | Expression | Parameter | Annotation
export interface CompileOptions {
  language?: "ts" | "js"
  target?: "modern" | "legacy"
  format?: "esm" | "cjs"
}
export interface FunctionType {
  kind: "function"
  params: Type[]
  result: Type
  variadic?: boolean
}
export type Type = Primitive | "void" | "unknown" | "console" | FunctionType
export function typeName(type: Type): string {
  return typeof type === "string"
    ? type
    : `(${type.params.map(typeName).join(", ")}) => ${typeName(type.result)}`
}

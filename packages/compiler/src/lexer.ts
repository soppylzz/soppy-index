import { fail, type Position, type Source, type Span } from "./model.ts"
export interface Token extends Span {
  kind: "identifier" | "keyword" | "string" | "number" | "punctuation" | "eof"
  text: string
  value?: string | number
}
const keywords = new Set([
  "const",
  "string",
  "number",
  "boolean",
  "true",
  "false",
  "import",
  "from",
  "export",
])
const reserved = new Set([
  "this",
  "arguments",
  "super",
  "new",
  "var",
  "let",
  "function",
  "return",
  "class",
  "async",
  "await",
  "if",
  "else",
  "while",
  "for",
  "throw",
  "null",
  "undefined",
  "default",
  "delete",
  "typeof",
  "void",
  "instanceof",
  "in",
  "switch",
  "case",
  "break",
  "continue",
  "try",
  "catch",
  "finally",
  "yield",
  "extends",
  "do",
  "with",
  "debugger",
  "enum",
  "implements",
  "interface",
  "package",
  "private",
  "protected",
  "public",
  "static",
  "eval",
])
/** Teaching counterpart of TypeScript createScanner. Scan UTF-16 code units. Positions are zero-based; ranges are half-open; CRLF is one line break. */
export function scan(source: Source): Token[] {
  const tokens: Token[] = []
  let offset = 0,
    line = 0,
    column = 0
  const position = (): Position => ({ offset, line, column })
  function advance(): string {
    const char = source.text[offset++]
    if (char === "\r") {
      if (source.text[offset] === "\n") offset++
      line++
      column = 0
    } else if (char === "\n") {
      line++
      column = 0
    } else column++
    return char
  }
  function error(start: Position, message: string): never {
    return fail(source, { start, end: position() }, "lexer", "L001", message)
  }
  while (offset < source.text.length) {
    const char = source.text[offset]
    if (/[ \t\r\n]/.test(char)) {
      advance()
      continue
    }
    const start = position()
    if (source.text.startsWith("//", offset)) {
      while (offset < source.text.length && !/[\r\n]/.test(source.text[offset])) advance()
      continue
    }
    if (source.text.startsWith("/*", offset)) {
      advance()
      advance()
      while (offset < source.text.length && !source.text.startsWith("*/", offset)) advance()
      if (offset === source.text.length) error(start, "Unterminated block comment")
      advance()
      advance()
      continue
    }
    let kind: Token["kind"], value: Token["value"]
    if (/[A-Za-z_$]/.test(char)) {
      advance()
      while (offset < source.text.length && /[A-Za-z0-9_$]/.test(source.text[offset])) advance()
      const name = source.text.slice(start.offset, offset)
      if (reserved.has(name)) error(start, `Unsupported or reserved word '${name}'`)
      kind = keywords.has(name) ? "keyword" : "identifier"
    } else if (/[0-9]/.test(char)) {
      advance()
      while (/[0-9]/.test(source.text[offset] ?? "")) advance()
      if (source.text[offset] === ".") {
        advance()
        if (!/[0-9]/.test(source.text[offset] ?? ""))
          error(start, "A decimal point requires digits")
        while (/[0-9]/.test(source.text[offset] ?? "")) advance()
      }
      const raw = source.text.slice(start.offset, offset)
      if (raw[0] === "0" && /[0-9]/.test(raw[1] ?? ""))
        error(start, "Leading-zero numeric literals are unsupported")
      value = Number(raw)
      if (!Number.isFinite(value)) error(start, "Number must be finite")
      kind = "number"
    } else if (char === '"' || char === "'") {
      const quote = advance()
      let decoded = "",
        closed = false
      while (offset < source.text.length) {
        if (source.text[offset] === quote) {
          advance()
          closed = true
          break
        }
        if (/[\r\n\u2028\u2029]/.test(source.text[offset]))
          error(start, "Line breaks in strings are unsupported")
        let part = advance()
        if (part === "\\") {
          if (offset === source.text.length) error(start, "Unterminated string escape")
          const escape = advance()
          const escapes: Record<string, string> = {
            n: "\n",
            r: "\r",
            t: "\t",
            "\\": "\\",
            '"': '"',
            "'": "'",
          }
          if (!(escape in escapes)) error(start, `Unsupported escape '\\${escape ?? ""}'`)
          part = escapes[escape]
        }
        decoded += part
      }
      if (!closed) error(start, "Unterminated string")
      kind = "string"
      value = decoded
    } else if (source.text.startsWith("=>", offset)) {
      advance()
      advance()
      kind = "punctuation"
    } else if ("():;=+,.{}".includes(char)) {
      advance()
      kind = "punctuation"
    } else {
      advance()
      error(start, `Unsupported character '${char}'`)
    }
    tokens.push({
      kind,
      text: source.text.slice(start.offset, offset),
      value,
      start,
      end: position(),
    })
  }
  tokens.push({ kind: "eof", text: "", start: position(), end: position() })
  return tokens
}

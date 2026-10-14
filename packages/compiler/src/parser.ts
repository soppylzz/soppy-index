import {
  fail,
  type Annotation,
  type Arrow,
  type Expression,
  type Identifier,
  type Import,
  type Literal,
  type Parameter,
  type Primitive,
  type Program,
  type Source,
  type Statement,
} from "./model.ts"
import { scan, type Token } from "./lexer.ts"
/** Teaching counterpart of TypeScript createSourceFile. Recursive descent: primary -> member/call -> left-associative '+'; arrows have the lowest precedence. */
export function parse(
  source: Source,
  language: "ts" | "js" = "ts",
  tokens = scan(source)
): Program {
  let index = 0
  const current = () => tokens[index]
  const at = (text: string) => current().text === text
  function error(message: string): never {
    return fail(source, current(), "parser", "P001", message)
  }
  function take(text: string): Token {
    if (!at(text)) error(`Expected '${text}', received '${current().text || "EOF"}'`)
    return tokens[index++]
  }
  function identifier(): Identifier {
    const token = current()
    if (token.kind !== "identifier") error("Expected an identifier")
    index++
    return { kind: "Identifier", name: token.text, start: token.start, end: token.end }
  }
  function annotation(): Annotation | undefined {
    if (!at(":")) return undefined
    if (language === "js") error("Type annotations are unsupported in JS mode")
    take(":")
    const token = current()
    if (!["string", "number", "boolean"].includes(token.text))
      error("Only primitive type annotations are supported")
    index++
    return { kind: "Annotation", name: token.text as Primitive, start: token.start, end: token.end }
  }
  function arrowAhead(): boolean {
    if (!at("(")) return false
    let depth = 0
    for (let cursor = index; cursor < tokens.length; cursor++) {
      if (tokens[cursor].text === "(") depth++
      if (tokens[cursor].text === ")" && --depth === 0)
        return ["=>", ":"].includes(tokens[cursor + 1]?.text)
    }
    return false
  }
  function arrow(): Arrow {
    const start = take("(").start
    const params: Parameter[] = []
    if (!at(")"))
      do {
        const name = identifier()
        const type = annotation()
        if (language === "ts" && !type)
          error("TS arrow parameters require an explicit primitive type")
        params.push({
          kind: "Parameter",
          name,
          annotation: type,
          start: name.start,
          end: type?.end ?? name.end,
        })
        if (!at(",")) break
        take(",")
      } while (current().kind !== "eof")
    take(")")
    const type = annotation()
    if (current().start.line !== tokens[index - 1].end.line)
      error("A line break before => is unsupported")
    take("=>")
    const body = expression()
    return { kind: "Arrow", params, annotation: type, body, start, end: body.end }
  }
  function primary(): Expression {
    const token = current()
    if (at("(")) {
      const start = take("(").start
      const inner = expression()
      const end = take(")").end
      return { kind: "Group", expression: inner, start, end }
    }
    if (token.kind === "identifier") return identifier()
    if (token.kind === "string" || token.kind === "number" || at("true") || at("false")) {
      index++
      return {
        kind: "Literal",
        value: token.value ?? token.text === "true",
        start: token.start,
        end: token.end,
      }
    }
    return error("Expected an expression in the supported subset")
  }
  function postfix(): Expression {
    let result = primary()
    if (result.kind === "Identifier" && result.name === "console" && !at("."))
      error("console may only be used as console.log")
    while (at(".") || at("(")) {
      if (at(".")) {
        take(".")
        const property = identifier()
        if (result.kind !== "Identifier" || result.name !== "console" || property.name !== "log")
          error("Only console.log member access is supported")
        result = {
          kind: "Member",
          object: result,
          property,
          start: result.start,
          end: property.end,
        }
      } else {
        take("(")
        const args: Expression[] = []
        if (!at(")"))
          do {
            args.push(expression())
            if (!at(",")) break
            take(",")
          } while (current().kind !== "eof")
        const end = take(")").end
        result = { kind: "Call", callee: result, args, start: result.start, end }
      }
    }
    return result
  }
  function expression(): Expression {
    if (arrowAhead()) return arrow()
    let result = postfix()
    while (at("+")) {
      take("+")
      const right = postfix()
      result = { kind: "Binary", left: result, right, start: result.start, end: right.end }
    }
    return result
  }
  function pathLiteral(): Literal {
    const token = current()
    if (token.kind !== "string") error("Expected a static module path string")
    index++
    return { kind: "Literal", value: token.value as string, start: token.start, end: token.end }
  }
  const statements: Statement[] = []
  let sawExecution = false
  while (current().kind !== "eof") {
    const start = current().start
    if (at("import")) {
      if (sawExecution) error("Imports must precede executable statements in this subset")
      take("import")
      const names: Identifier[] = []
      if (at("{")) {
        take("{")
        names.push(identifier())
        while (at(",")) {
          take(",")
          names.push(identifier())
        }
        take("}")
        take("from")
      }
      const path = pathLiteral()
      const end = take(";").end
      const statement: Import = { kind: "Import", names, path, start, end }
      statements.push(statement)
      continue
    }
    sawExecution = true
    let exported = false
    if (at("export")) {
      take("export")
      exported = true
      if (!at("const")) error("Only export const is supported")
    }
    if (at("const")) {
      take("const")
      const name = identifier()
      const type = annotation()
      take("=")
      const init = expression()
      const end = take(";").end
      statements.push({
        kind: "Variable",
        name,
        annotation: type,
        init,
        exported,
        declarationKind: "const",
        start,
        end,
      })
    } else {
      const value = expression()
      const end = take(";").end
      statements.push({ kind: "ExpressionStatement", expression: value, start, end })
    }
  }
  return { kind: "Program", statements, start: tokens[0].start, end: current().end }
}

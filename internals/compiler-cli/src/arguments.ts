import mri from "mri"
import { extname, resolve } from "node:path"
import type { CompileOptions } from "@soppy-index/compiler"
export type Command = "check" | "inspect" | "compile" | "modules"
export type Arguments =
  | { command: "help" }
  | {
      command: Command
      path: string
      options: CompileOptions
      outDir: string
      treeShake: boolean
      entryExports: string[]
    }
/** mri parses flag syntax; this adapter validates compiler-specific values and dependencies. */
export function parseArguments(args: string[]): Arguments {
  const parsed: Record<string, unknown> = mri(args, {
    alias: { help: "h", out: "o", target: [], format: [], shake: [], "entry-export": [] },
    string: ["out", "target", "format", "entry-export"],
    boolean: ["help", "shake"],
    unknown: (flag) => {
      throw new Error(`Unknown option '${flag}'`)
    },
  })
  for (const name of ["help", "shake"]) {
    if (parsed[name] !== undefined && typeof parsed[name] !== "boolean")
      throw new Error(`--${name} requires a single boolean flag`)
  }
  const positional = parsed._ as string[]
  if (parsed.help === true || !args.length) return { command: "help" }
  if (
    positional.length !== 2 ||
    !["check", "inspect", "compile", "modules"].includes(positional[0])
  )
    throw new Error("Expected command and one source file; use --help")
  function stringOption(name: string, fallback?: string): string | undefined {
    const value = parsed[name]
    if (value === undefined) return fallback
    if (typeof value !== "string" || !value || value.startsWith("--"))
      throw new Error(`--${name} requires one nonempty value`)
    return value
  }
  const target = stringOption("target", "modern"),
    format = stringOption("format", "esm")
  if (target !== "modern" && target !== "legacy") throw new Error("Target must be modern or legacy")
  if (format !== "esm" && format !== "cjs") throw new Error("Format must be esm or cjs")
  const entryValue = parsed["entry-export"]
  const entryExports: string[] = []
  for (const value of entryValue === undefined
    ? []
    : Array.isArray(entryValue)
      ? entryValue
      : [entryValue]) {
    if (typeof value !== "string" || !value || value.startsWith("--"))
      throw new Error("--entry-export requires a nonempty name")
    entryExports.push(value)
  }
  const command = positional[0] as Command,
    path = positional[1],
    treeShake = parsed.shake === true
  if ((treeShake || entryExports.length) && command !== "modules")
    throw new Error("Tree Shaking options require the modules command")
  if (entryExports.length && !treeShake) throw new Error("--entry-export requires --shake")
  return {
    command,
    path,
    options: { language: extname(path) === ".js" ? "js" : "ts", target, format },
    outDir: resolve(stringOption("out", "dist/output")!),
    treeShake,
    entryExports,
  }
}

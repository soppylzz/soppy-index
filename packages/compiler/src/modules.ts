import { readFile, realpath } from "node:fs/promises"
import { basename, dirname, extname, isAbsolute, relative, resolve } from "node:path"
import { analyze, type Analysis } from "./compiler.ts"
import { emitDeclarations } from "./declarations.ts"
import { emit } from "./emitter.ts"
import {
  fail,
  type CompileOptions,
  type Import,
  type Program,
  type Source,
  type Type,
} from "./model.ts"
import { parse } from "./parser.ts"
import { transform } from "./transform.ts"
export interface Module {
  file: string
  analysis: Analysis
  dependencies: Map<Import, string>
}
export interface ModuleGraph {
  entry: string
  root: string
  modules: Map<string, Module>
}
/** Dependency-first DFS. Only explicit .ts/.js or extensionless -> .ts, within the entry directory, with no cycles. */
export async function loadGraph(entryPath: string): Promise<ModuleGraph> {
  const entry = await realpath(resolve(entryPath))
  const graph: ModuleGraph = { entry, root: dirname(entry), modules: new Map() }
  const visiting = new Set<string>()
  async function visit(file: string, importer?: { source: Source; node: Import }): Promise<void> {
    if (visiting.has(file)) {
      if (importer)
        fail(
          importer.source,
          importer.node,
          "modules",
          "M003",
          "Circular dependencies are unsupported"
        )
      throw new Error("Circular entry")
    }
    if (graph.modules.has(file)) return
    visiting.add(file)
    const source: Source = { file, text: await readFile(file, "utf8") }
    const language = extname(file) === ".js" ? "js" : "ts"
    if (![".ts", ".js"].includes(extname(file)))
      fail(
        source,
        { start: { offset: 0, line: 0, column: 0 }, end: { offset: 0, line: 0, column: 0 } },
        "modules",
        "M001",
        "Module source must end in .ts or .js"
      )
    const ast = parse(source, language),
      dependencies = new Map<Import, string>(),
      imported = new Map<string, Type>()
    for (const statement of ast.statements)
      if (statement.kind === "Import") {
        const path = String(statement.path.value)
        if (!path.startsWith("./") && !path.startsWith("../"))
          fail(
            source,
            statement.path,
            "modules",
            "M001",
            "Only relative static module paths are supported"
          )
        const suffix = extname(path)
        if (suffix && ![".ts", ".js"].includes(suffix))
          fail(source, statement.path, "modules", "M001", "Imports allow .ts, .js or no extension")
        let target: string
        try {
          target = await realpath(resolve(dirname(file), suffix ? path : `${path}.ts`))
        } catch {
          fail(source, statement.path, "modules", "M002", `Module '${path}' was not found`)
        }
        const local = relative(graph.root, target)
        if (local.startsWith("../") || isAbsolute(local))
          fail(source, statement.path, "modules", "M001", "Module escapes the entry directory")
        await visit(target, { source, node: statement })
        dependencies.set(statement, target)
        const dependency = graph.modules.get(target)!
        for (const name of statement.names) {
          const symbol = dependency.analysis.binding.exports.get(name.name)
          if (!symbol?.type)
            fail(source, name, "modules", "M004", `Module '${path}' does not export '${name.name}'`)
          imported.set(name.name, symbol.type)
        }
      }
    const analysis = analyze(source, { language }, imported)
    // Use the analysis AST as map keys; parsing above only discovers dependencies.
    const imports = analysis.ast.statements.filter((s) => s.kind === "Import")
    const resolved = [...dependencies.values()]
    graph.modules.set(file, {
      file,
      analysis,
      dependencies: new Map(imports.map((node, i) => [node, resolved[i]])),
    })
    visiting.delete(file)
  }
  await visit(entry)
  return graph
}
export interface ModuleOutputOptions extends CompileOptions {
  declarations?: boolean
}
export function emitGraph(
  graph: ModuleGraph,
  outDir: string,
  programs: Map<string, Program>,
  options: ModuleOutputOptions = {}
): { artifacts: Map<string, string>; outputs: string[]; entryOutput: string } {
  const extension = options.format === "cjs" ? ".cjs" : ".js"
  const outputName = (file: string) =>
    relative(graph.root, file).slice(0, -extname(file).length) + extension
  const names = new Set<string>(),
    outputs: string[] = []
  for (const module of graph.modules.values()) {
    const name = outputName(module.file)
    if (names.has(name))
      fail(
        module.analysis.source,
        module.analysis.ast,
        "modules",
        "M007",
        `Output collision for '${name}'`
      )
    names.add(name)
  }
  const artifacts = new Map<string, string>()
  for (const module of graph.modules.values()) {
    const output = resolve(outDir, outputName(module.file))
    const mappingSource = {
      ...module.analysis.source,
      file: relative(dirname(output), module.file).split("\\").join("/"),
    }
    const ast = programs.get(module.file) ?? module.analysis.ast
    const pathResolver = (path: string): string => {
      const target = [...module.dependencies].find(([node]) => node.path.value === path)?.[1]
      if (!target)
        fail(module.analysis.source, ast, "modules", "M005", `Unresolved module path '${path}'`)
      let pathOut = relative(dirname(output), resolve(outDir, outputName(target)))
        .split("\\")
        .join("/")
      if (!pathOut.startsWith(".")) pathOut = `./${pathOut}`
      return pathOut
    }
    const transformed = transform(module.analysis.source, ast, options, pathResolver)
    const emitted = emit(mappingSource, transformed.program, basename(output))
    artifacts.set(output, emitted.code)
    artifacts.set(`${output}.map`, JSON.stringify(emitted.map))
    outputs.push(output)
    if (options.declarations !== false) {
      const declarationName = output.replace(
        /\.(js|cjs)$/,
        options.format === "cjs" ? ".d.cts" : ".d.ts"
      )
      // Publish the original checked public API, independently of runtime reachability.
      const declaration = emitDeclarations(
        { ...module.analysis, source: mappingSource },
        basename(declarationName)
      )
      artifacts.set(declarationName, declaration.code)
      artifacts.set(`${declarationName}.map`, JSON.stringify(declaration.map))
    }
  }
  return { artifacts, outputs, entryOutput: resolve(outDir, outputName(graph.entry)) }
}

import { readFile, writeFile } from "node:fs/promises"
import { basename, dirname, extname, relative, resolve } from "node:path"
import { emit } from "@soppy-index/compiler/emitter"
import { symbolTable } from "@soppy-index/compiler/binder"
import { analyze, compile } from "@soppy-index/compiler/compiler"
import { emitDeclarations } from "@soppy-index/compiler/declarations"
import { loadGraph } from "@soppy-index/compiler/modules"
import { writeGraph } from "./writer.ts"
import { writeArtifacts } from "./output.ts"
import { shake } from "@soppy-index/compiler/shake"
import { parseArguments } from "./arguments.ts"
export async function main(args = process.argv.slice(2)): Promise<void> {
  const argumentsResult = parseArguments(args)
  if (argumentsResult.command === "help") {
    console.log(
      "Mini compiler: check|inspect|compile|modules <file> [--target modern|legacy] [--format esm|cjs] [--out dir] [--shake] [--entry-export name] [-h|--help]"
    )
    return
  }
  const { command, path, options, outDir, treeShake, entryExports } = argumentsResult
  if (command === "modules") {
    const graph = await loadGraph(path),
      shaking = treeShake ? shake(graph, entryExports) : undefined
    const files = await writeGraph(graph, outDir, shaking?.programs ?? new Map(), options)
    if (shaking) {
      await writeFile(resolve(outDir, "shake-report.json"), JSON.stringify(shaking.report, null, 2))
      console.log(JSON.stringify(shaking.report, null, 2))
    }
    console.log(JSON.stringify({ event: "modules-emitted", files }))
    return
  }
  const source = { file: resolve(path), text: await readFile(path, "utf8") }
  if (command === "check") {
    const analysis = analyze(source, options)
    console.log(
      JSON.stringify({
        event: "check-passed",
        file: source.file,
        symbols: symbolTable(analysis.binding),
      })
    )
    return
  }
  const extension = options.format === "cjs" ? ".cjs" : ".js"
  const output = resolve(outDir, basename(path, extname(path)) + extension)
  if (resolve(outDir) === dirname(source.file) && command === "compile")
    throw new Error("Output would overwrite the input source; choose another --out directory")
  const result = compile(source, options, basename(output))
  if (command === "inspect") {
    console.log(
      JSON.stringify(
        {
          tokens: result.tokens,
          ast: result.ast,
          symbols: symbolTable(result.binding),
          passes: result.transformed.passes,
          code: result.code,
          map: result.map,
        },
        null,
        2
      )
    )
    return
  }
  const mappingSource = {
    ...source,
    file: relative(dirname(output), source.file).split("\\").join("/"),
  }
  // Re-emission only changes the source path, retaining the same origin coordinates.
  const emitted = emit(mappingSource, result.transformed.program, basename(output))
  const declarationPath = output.replace(
    /\.(js|cjs)$/,
    options.format === "cjs" ? ".d.cts" : ".d.ts"
  )
  const declaration = emitDeclarations(
    { ...result, source: mappingSource },
    basename(declarationPath)
  )
  await writeArtifacts(
    outDir,
    new Map([
      [output, emitted.code],
      [`${output}.map`, JSON.stringify(emitted.map)],
      [declarationPath, declaration.code],
      [`${declarationPath}.map`, JSON.stringify(declaration.map)],
    ])
  )
  console.log(
    JSON.stringify({ event: "emitted", output, map: `${output}.map`, declaration: declarationPath })
  )
}

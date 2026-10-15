import { readFile, writeFile } from "node:fs/promises"
import { basename, dirname, extname, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import {
  compile,
  emitDeclarations,
  loadGraph,
  shake,
  type CompileOptions,
  type ModuleOutputOptions,
  type Source,
  type SourceMap,
} from "@soppy-index/compiler"
import { writeArtifacts } from "./output.ts"
import { writeGraph } from "./writer.ts"

const root = fileURLToPath(new URL("../", import.meta.url))
const outputDirectory = resolve(root, "dist/output")

export async function readSource(path: string): Promise<Source> {
  const file = resolve(root, path)
  return { file, text: await readFile(file, "utf8") }
}

function mapText(map: SourceMap, outDir: string): string {
  return JSON.stringify({
    ...map,
    sources: map.sources.map((file) =>
      file === null ? null : relative(outDir, file).split("\\").join("/")
    ),
  })
}

export async function compileExample(
  path: string,
  options: CompileOptions = {},
  outDir = outputDirectory
): Promise<string> {
  const source = await readSource(path)
  if (resolve(outDir) === dirname(source.file))
    throw new Error("Output directory must differ from source directories")
  const stem = basename(source.file, extname(source.file))
  const output = resolve(outDir, stem + (options.format === "cjs" ? ".cjs" : ".js"))
  const result = compile(source, options, basename(output))
  const declarationPath = resolve(outDir, stem + (options.format === "cjs" ? ".d.cts" : ".d.ts"))
  const declaration = emitDeclarations(result, basename(declarationPath))
  await writeArtifacts(
    outDir,
    new Map([
      [output, result.code],
      [`${output}.map`, mapText(result.map, outDir)],
      [declarationPath, declaration.code],
      [`${declarationPath}.map`, mapText(declaration.map, outDir)],
    ])
  )
  console.log(`[compile] ${source.file} -> ${output}`)
  return output
}

export async function compileModules(options: ModuleOutputOptions = {}): Promise<string> {
  const graph = await loadGraph(resolve(root, "examples/modules/main.ts"))
  const shaking = shake(graph)
  const output = await writeGraph(graph, outputDirectory, shaking.programs, options)
  await writeFile(
    resolve(outputDirectory, "shake-report.json"),
    JSON.stringify(shaking.report, null, 2)
  )
  console.log(JSON.stringify(shaking.report, null, 2))
  console.log(`[modules] ${output}`)
  return output
}

import { realpath } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import {
  emitGraph,
  fail,
  type ModuleGraph,
  type ModuleOutputOptions,
  type Program,
} from "@soppy-index/compiler"
import { writeArtifacts } from "./output.ts"
export async function writeGraph(
  graph: ModuleGraph,
  outDir: string,
  programs: Map<string, Program>,
  options: ModuleOutputOptions = {}
): Promise<string> {
  let canonicalOutput = resolve(outDir)
  try {
    canonicalOutput = await realpath(canonicalOutput)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
  if ([...graph.modules.values()].some((module) => dirname(module.file) === canonicalOutput)) {
    const entry = graph.modules.get(graph.entry)!.analysis
    fail(
      entry.source,
      entry.ast,
      "modules",
      "M009",
      "Output directory must differ from source directories"
    )
  }
  const result = emitGraph(graph, outDir, programs, options)
  await writeArtifacts(outDir, result.artifacts)
  return result.entryOutput
}

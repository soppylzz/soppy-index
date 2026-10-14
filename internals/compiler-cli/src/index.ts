import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { CompileError } from "@soppy-index/compiler"
import { main } from "./cli.ts"
export { main } from "./cli.ts"
export { parseArguments } from "./arguments.ts"
export { writeArtifacts } from "./output.ts"
export { writeGraph } from "./writer.ts"
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(
      error instanceof CompileError
        ? JSON.stringify(error.diagnostics, null, 2)
        : (error as Error).message
    )
    process.exitCode = 1
  })
}

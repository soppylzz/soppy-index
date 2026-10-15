import { analyze, CompileError } from "@soppy-index/compiler"
import { readSource } from "./experiments.ts"

try {
  for (const file of ["syntax-error.mini", "type-errors.mini"]) {
    const source = await readSource(`fixtures/${file}`)
    try {
      analyze(source)
      throw new Error(`Expected diagnostics for '${file}'`)
    } catch (error) {
      if (!(error instanceof CompileError)) throw error
      console.log(error.message)
    }
  }
} catch (error) {
  console.error((error as Error).message)
  process.exitCode = 1
}

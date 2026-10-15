import { analyze, symbolTable } from "@soppy-index/compiler"
import { readSource } from "./experiments.ts"

try {
  const source = await readSource("examples/hello.ts")
  const analysis = analyze(source)
  console.log(
    JSON.stringify({ file: source.file, symbols: symbolTable(analysis.binding) }, null, 2)
  )
} catch (error) {
  console.error((error as Error).message)
  process.exitCode = 1
}

import { compile, symbolTable } from "@soppy-index/compiler"
import { readSource } from "./experiments.ts"

try {
  const result = compile(await readSource("examples/hello.ts"), { target: "legacy" })
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
} catch (error) {
  console.error((error as Error).message)
  process.exitCode = 1
}

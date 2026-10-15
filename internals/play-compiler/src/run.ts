import { execa } from "execa"
import { compileExample, compileModules } from "./experiments.ts"

const experiments = {
  hello: () => compileExample("examples/hello.ts", { language: "ts", target: "legacy" }),
  "hello-js": () => compileExample("examples/hello.js", { language: "js", target: "legacy" }),
  modules: () => compileModules({ format: "esm" }),
  "modules-cjs": () => compileModules({ format: "cjs", target: "legacy" }),
}

try {
  const name = process.argv[2]
  if (!Object.hasOwn(experiments, name)) throw new Error(`Unknown experiment '${name}'`)
  const output = await experiments[name as keyof typeof experiments]()
  await execa(process.execPath, [output], { stdio: "inherit", timeout: 5000 })
} catch (error) {
  console.error((error as Error).message)
  process.exitCode = 1
}

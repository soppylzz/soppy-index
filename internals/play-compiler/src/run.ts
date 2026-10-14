import { resolve } from "node:path"
import { execa } from "execa"
import { main } from "@soppy-index/compiler-cli"
import { runLab } from "../../../docs/node/lab.ts"
const modes = {
  hello: ["compile", "examples/hello.ts", "--target", "legacy"],
  "hello-js": ["compile", "examples/hello.js", "--target", "legacy"],
  modules: ["modules", "examples/modules/main.ts", "--shake"],
  "modules-cjs": [
    "modules",
    "examples/modules/main.ts",
    "--shake",
    "--target",
    "legacy",
    "--format",
    "cjs",
  ],
}
const mode = process.argv[2] as keyof typeof modes
await runLab("compiler-play", async () => {
  if (!(mode in modes)) throw new Error(`Unknown mode '${mode}'`)
  await main(modes[mode])
  const output = mode.startsWith("hello")
    ? "hello.js"
    : mode === "modules-cjs"
      ? "main.cjs"
      : "main.js"
  await execa(process.execPath, [resolve("dist/output", output)], {
    stdio: "inherit",
    timeout: 5000,
  })
})

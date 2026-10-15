import { fileURLToPath } from "node:url"
import { glob } from "tinyglobby"
import { execa } from "execa"
const root = fileURLToPath(new URL("../../../", import.meta.url))
try {
  const [workspace, suite, ...extra] = process.argv.slice(2)
  if (extra.length) throw new Error("Expected a workspace and optional test suite prefix")
  const prefix = [workspace, suite].filter(Boolean).join("/")
  const discovered = await glob(
    ["packages/*/__test__/**/*.test.ts", "internals/*/__test__/**/*.test.ts"],
    {
      cwd: root,
      ignore: ["**/node_modules/**", "**/dist/**"],
    }
  )
  const selected = discovered
    .filter((file) => {
      const [, name, , ...path] = file.split("/")
      const key = `${name}/${path.join("/")}`
      return !prefix || key.startsWith(`${prefix}/`) || key === `${prefix}.test.ts`
    })
    .sort()
  if (!selected.length) throw new Error(`No tests matched '${prefix || "all"}'`)
  console.log(`[test] ${selected.length} files; suite=${prefix || "all"}; native Node test runner`)
  await execa(
    process.execPath,
    ["--conditions=development", "--test", "--test-reporter=spec", ...selected],
    { cwd: root, stdio: "inherit", timeout: 30000 }
  )
} catch (error) {
  console.error((error as Error).message)
  process.exitCode = 1
}

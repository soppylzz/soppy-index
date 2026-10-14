import { fileURLToPath } from "node:url"
import { glob } from "tinyglobby"
import { execa } from "execa"
const root = fileURLToPath(new URL("../", import.meta.url))
try {
  const [suite, ...extra] = process.argv.slice(2)
  if (extra.length) throw new Error("Expected zero or one test suite prefix")
  const discovered = await glob(["**/*.test.ts"], {
    cwd: root,
    ignore: ["node_modules/**", "dist/**"],
  })
  const selected = discovered
    .filter((file) => !suite || file.startsWith(`${suite}/`) || file === `${suite}.test.ts`)
    .sort()
  if (!selected.length) throw new Error(`No tests matched '${suite ?? "all"}'`)
  console.log(`[test] ${selected.length} files; suite=${suite ?? "all"}; native Node test runner`)
  await execa(
    process.execPath,
    ["--conditions=development", "--test", "--test-reporter=spec", ...selected],
    { cwd: root, stdio: "inherit", timeout: 30000 }
  )
} catch (error) {
  console.error((error as Error).message)
  process.exitCode = 1
}

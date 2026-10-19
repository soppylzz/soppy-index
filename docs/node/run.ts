import { fileURLToPath } from "node:url"
import { log, runLab, runNode } from "./lab.ts"

const lessons = [
  "runtime",
  "modules",
  "event-loop",
  "async",
  "events",
  "files",
  "streams",
  "parallelism",
  "diagnostics",
  "testing",
  "extensions",
] as const

const requested = process.argv.slice(2)
if (requested.length === 1 && requested[0] === "--list") {
  console.log(lessons.join("\n"))
} else {
  await runLab("node-learning-path", async () => {
    const selected = requested.length ? requested : lessons
    for (const name of selected) {
      if (!lessons.some((lesson) => lesson === name)) {
        throw new Error(`Unknown CLI lesson: ${name}. Use --list to see available lessons.`)
      }
    }
    for (const name of selected) {
      log("lesson-start", { name })
      const { stdout, stderr } = await runNode([
        fileURLToPath(new URL(`./${name}/index.ts`, import.meta.url)),
      ])
      process.stdout.write(stdout)
      process.stderr.write(stderr)
    }
    log("lessons-complete", { count: selected.length })
  })
}

import { readFileSync } from "node:fs"
import { join } from "node:path"

export const runtime = "nodejs"
export function GET() {
  const hero = readFileSync(
    join(process.cwd(), "node_modules/@heroui/styles/dist/heroui.min.css"),
    "utf8"
  )
  const layout = readFileSync(join(process.cwd(), "app/styles.css"), "utf8").replace(
    /^@import[^;]*;/gm,
    ""
  )
  return new Response(hero + "\n" + layout, {
    headers: { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "no-store" },
  })
}

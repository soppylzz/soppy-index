import { test } from "vitest"
import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { startLab } from "./server.mjs"

test("production UI renders HeroUI controls and serves its compiled stylesheet", async () => {
  const lab = await startLab(fileURLToPath(new URL("..", import.meta.url)), 15003)
  try {
    const response = await fetch(lab.url)
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.match(html, /class="[^"]*button/)
    assert.match(html, /class="[^"]*select/)
    assert.match(html, /class="[^"]*table/)
    assert.match(html, /Change server version/)
    for (const href of [...html.matchAll(/<link[^>]*href="([^"]+\.css(?:\?[^"]*)?)"/g)].map(
      (match) => match[1]
    )) {
      const css = await fetch(new URL(href, lab.url))
      assert.equal(css.status, 200)
      assert.match(await css.text(), /\.button/)
    }
  } finally {
    await lab.close()
  }
})

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
    const stylesheets = [...html.matchAll(/<link[^>]*href="([^"]+\.css(?:\?[^"]*)?)"/g)].map(
      (match) => match[1]
    )
    assert(stylesheets.length > 0, "The page must load a stylesheet")
    const styles = []
    for (const href of stylesheets) {
      const css = await fetch(new URL(href, lab.url))
      assert.equal(css.status, 200)
      styles.push(await css.text())
    }
    // Next.js may split the component library and page layout into separate CSS chunks.
    const combinedStyles = styles.join("\n")
    assert.match(combinedStyles, /\.button/)
    assert.match(combinedStyles, /\.select__trigger/)
    assert.match(combinedStyles, /\.table__cell/)
    assert.match(combinedStyles, /\.card__header/)
  } finally {
    await lab.close()
  }
})

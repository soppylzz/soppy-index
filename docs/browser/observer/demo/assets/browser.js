/* global document */
;(() => {
  function createLogger(
    target,
    { limit = 120, context = "", clock = "utc", console: mirror = false } = {}
  ) {
    const node = typeof target === "string" ? document.querySelector(target) : target
    if (!node || !["OL", "UL", "PRE"].includes(node.tagName))
      throw new Error("Logger target must be an ol, ul or pre")
    if (!Number.isInteger(limit) || limit < 1) throw new Error("Logger limit must be positive")
    if (!["utc", "relative"].includes(clock)) throw new Error("Unsupported logger clock")
    const rows = []
    return function log(message) {
      const time =
        clock === "relative" ? `${performance.now().toFixed(1)}ms` : new Date().toISOString()
      const row = `${time}${context ? ` [${context}]` : ""} | ${String(message)}`
      if (node.tagName === "PRE") {
        rows.push(row)
        if (rows.length > limit) rows.shift()
        node.textContent = rows.join("\n")
      } else {
        const item = document.createElement("li")
        item.textContent = row
        node.append(item)
        while (node.children.length > limit) node.firstElementChild.remove()
      }
      if (mirror) console.log(row)
      return row
    }
  }
  globalThis.Demo = Object.freeze({ createLogger })
})()

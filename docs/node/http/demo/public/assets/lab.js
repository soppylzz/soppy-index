/* global document, window */
const identity = crypto.randomUUID().slice(0, 8)
const log = globalThis.Demo.createLogger("#log", { context: identity, console: true })
document.querySelector("#identity").textContent = `Context ${identity} · ${window.location.origin}`
const pending = new Set()
function cancel() {
  for (const controller of pending) controller.abort()
  pending.clear()
  document.querySelector("#status").textContent = "Pending operations cancelled"
  log("Cancelled pending requests")
}
async function run(mode) {
  const controller = new AbortController()
  pending.add(controller)
  const id = crypto.randomUUID()
  let timer
  document.querySelector("#status").textContent = `Requesting: ${mode}`
  log(`Start ${mode} id=${id}; no receipt or processing evidence yet`)
  try {
    if (mode === "cancel") timer = setTimeout(() => controller.abort(), 50)
    const body =
      mode === "valid"
        ? { id, text: "Valid message" }
        : mode === "invalid"
          ? { id, text: 42 }
          : { id, text: "x".repeat(600) }
    const response = await fetch(
      mode === "cancel" ? "/slow" : mode === "stream" ? "/stream" : "/echo",
      mode === "cancel" || mode === "stream"
        ? { signal: controller.signal }
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
          }
    )
    log(`HTTP response ${response.status}; business result still needs parsing`)
    if (mode === "stream") {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let bytes = 0
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          bytes += value.byteLength
          log(
            `Received chunk ${value.byteLength} bytes: ${decoder.decode(value, { stream: true })}`
          )
        }
        const tail = decoder.decode()
        if (tail) log(`Decoder tail: ${tail}`)
        log(`Read complete: ${bytes} bytes; network chunks may differ from server writes`)
      } finally {
        reader.releaseLock()
      }
    } else {
      const result = await response.json()
      if (response.ok && result.id === id && result.accepted === true)
        log(`Business acknowledgment matched id=${id}`)
      else log(`No matching business acknowledgment: ${JSON.stringify(result)}`)
    }
  } catch (error) {
    log(
      `Request ended: ${error.name}; cancellation or transport failure does not prove the business operation did not run`
    )
  } finally {
    clearTimeout(timer)
    pending.delete(controller)
    document.querySelector("#status").textContent = `Pending operations: ${pending.size}`
  }
}
for (const mode of ["valid", "invalid", "large", "cancel", "stream"])
  document.querySelector(`#${mode}`).addEventListener("click", () => run(mode))
document.querySelector("#disconnect").addEventListener("click", cancel)
window.addEventListener("pagehide", cancel)

import assert from "node:assert/strict"
import { monitorEventLoopDelay, performance } from "node:perf_hooks"
import { setTimeout as delay } from "node:timers/promises"
import { log, runLab } from "../lab.ts"

await runLab("diagnostics", async () => {
  const cache = new Map<number, Buffer>()
  const before = process.memoryUsage()
  for (let index = 0; index < 4; index++) {
    cache.set(index, Buffer.alloc(2 * 1024 * 1024, index))
    while (cache.size > 2) cache.delete(cache.keys().next().value!)
  }
  assert.equal(cache.size, 2)
  log("memory-sample", {
    before,
    after: process.memoryUsage(),
    retainedCacheBytes: [...cache.values()].reduce((sum, buffer) => sum + buffer.length, 0),
    note: "GC timing and RSS are not deterministic",
  })
  cache.clear()
  log("references-released", {
    cacheSize: cache.size,
    after: process.memoryUsage(),
    note: "No immediate GC or RSS decrease is guaranteed",
  })
  const histogram = monitorEventLoopDelay({ resolution: 10 })
  histogram.enable()
  const initial = performance.eventLoopUtilization()
  try {
    await delay(25)
    performance.mark("bounded-block-start")
    const until = performance.now() + 25
    let iterations = 0
    while (performance.now() < until) iterations++
    performance.mark("bounded-block-end")
    const measure = performance.measure("bounded-block", "bounded-block-start", "bounded-block-end")
    await delay(25)
    const utilization = performance.eventLoopUtilization(initial)
    log("actual-loop-metrics", {
      busyDurationMs: measure.duration,
      iterations,
      delayMeanMs: histogram.mean / 1e6,
      delayMaxMs: histogram.max / 1e6,
      utilization: utilization.utilization,
    })
  } finally {
    histogram.disable()
    performance.clearMarks()
    performance.clearMeasures()
  }
  log("diagnostics-cleanup", {
    histogramDisabled: true,
    marks: performance.getEntriesByType("mark").length,
  })
})

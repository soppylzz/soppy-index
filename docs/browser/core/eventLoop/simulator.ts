/**
 * Deterministic teaching model, not a browser implementation.
 * See ./eventLoop.md and ./simulator.md for guarantees and simplifications.
 */

/* ==================== virtual clock & log ==================== */

const FRAME_MS = 1000 / 60
const IDLE_WINDOW_MS = 50

let now = 0
let nextFrameAt = FRAME_MS
let frameDirty = false
let missedFrames = 0

function log(phase: string, label: string): void {
  const time = now.toFixed(1).padStart(6)
  console.log(`[t=${time}ms] ${phase.padEnd(7)} ${label}`)
}

/* ==================== queues ==================== */

type TaskSource =
  "script" | "user-interaction" | "timer" | "networking" | "idle-timeout" | "intersection-observer"

interface TaskItem {
  source: TaskSource
  label: string
  dueTime: number
  run: () => void
}

interface MicrotaskItem {
  label: string
  run: () => void
}

interface FrameCallback {
  label: string
  run: (timestamp: number) => void
}

interface IdleDeadline {
  didTimeout: boolean
  timeRemaining: () => number
}

interface IdleCallback {
  label: string
  timeoutDeadline: number | null
  run: (deadline: IdleDeadline) => void
}

const taskQueue: TaskItem[] = []
const microtaskQueue: MicrotaskItem[] = []
let rafQueue: FrameCallback[] = []
const ricQueue: IdleCallback[] = []
let ioPending: string | null = null
let mutationRecords: string[] = []
let mutationDeliveryQueued = false

function enqueueTask(source: TaskSource, dueTime: number, label: string, run: () => void): void {
  taskQueue.push({ source, label, dueTime, run })
}

function microtask(label: string, run: () => void): void {
  microtaskQueue.push({ label, run })
}

/* ==================== web API stand-ins ==================== */

function scheduleTimer(label: string, delayMs: number, run: () => void): void {
  // Expiry only makes the callback eligible; it still waits for the loop.
  enqueueTask("timer", now + delayMs, label, run)
}

function simulateNetworkResponse(label: string, latencyMs: number, onDone: () => void): void {
  // The host performs network work off the main thread; the completion is
  // delivered to the page as a networking task.
  enqueueTask("networking", now + latencyMs, label, onDone)
}

function mutateDom(label: string): void {
  mutationRecords.push(label)
  if (mutationDeliveryQueued) return
  mutationDeliveryQueued = true
  // One coalesced notification microtask per checkpoint, not one task per mutation.
  microtask("MutationObserver (notification microtask)", () => {
    log("RUN", `MutationObserver delivers ${mutationRecords.length} record(s)`)
    mutationRecords = []
    mutationDeliveryQueued = false
  })
}

function requestAnimationFrame(label: string, run: (timestamp: number) => void): void {
  rafQueue.push({ label, run })
}

function requestIdleCallback(
  label: string,
  run: (deadline: IdleDeadline) => void,
  timeoutMs?: number
): void {
  ricQueue.push({
    label,
    timeoutDeadline: timeoutMs === undefined ? null : now + timeoutMs,
    run,
  })
}

function observeIntersection(label: string): void {
  ioPending = label
}

function domWrite(label: string): void {
  frameDirty = true
  log("DOM", `${label} (marks rendering dirty)`)
}

function readLayoutAfterWrite(): void {
  log("DOM", "read offsetWidth -> forced synchronous style + layout inside this task")
}

function blockMainThread(label: string, durationMs: number): void {
  while (nextFrameAt <= now + durationMs) {
    nextFrameAt += FRAME_MS
    missedFrames++
  }
  log("RUN", `${label}: main thread blocked ${durationMs}ms`)
  now += durationMs
}

/* ==================== event loop phases ==================== */

function performMicrotaskCheckpoint(): void {
  // Drains the whole queue, including microtasks queued by earlier microtasks.
  for (;;) {
    const item = microtaskQueue.shift()
    if (!item) break
    log("MICRO", item.label)
    item.run()
  }
}

// Demo policy: prefer user input, then FIFO. The spec does not fix this order
// across task sources; browsers bias toward input for responsiveness.
function pickEligibleTask(): TaskItem | undefined {
  const eligible = taskQueue.filter((task) => task.dueTime <= now)
  return eligible.find((task) => task.source === "user-interaction") ?? eligible[0]
}

function style(): void {
  log("RENDER", "style")
}

function layout(): void {
  log("RENDER", "layout")
}

function prePaint(): void {
  log("RENDER", "pre-paint")
}

function paint(): void {
  log("RENDER", "paint")
}

function layerize(): void {
  log("RENDER", "layerize")
}

function updateTheRendering(): void {
  const missed = missedFrames
  missedFrames = 0
  log(
    "RENDER",
    missed > 0
      ? `frame update (${missed} frame deadline(s) missed during long tasks)`
      : "frame update"
  )

  // Run the animation frame callbacks. Callbacks registered here are picked up
  // by the next frame, not this one.
  const callbacks = rafQueue
  rafQueue = []
  for (const callback of callbacks) {
    log("RAF", callback.label)
    callback.run(now)
    performMicrotaskCheckpoint()
  }

  style()
  layout()

  // Geometry observation and callback delivery are separate steps.
  if (ioPending !== null) {
    const target = ioPending
    ioPending = null
    log("RENDER", "intersection observations updated; notification task queued")
    enqueueTask("intersection-observer", now, "notify intersection observers", () => {
      log("IO", `IntersectionObserver callback: ${target}`)
    })
  }

  prePaint()
  paint()
  layerize()
  log("RENDER", "tile -> raster -> composite -> display (compositor side, off main thread)")
  frameDirty = false
}

function promoteExpiredIdleCallbacks(): void {
  for (const item of [...ricQueue]) {
    if (item.timeoutDeadline === null || item.timeoutDeadline > now) continue
    ricQueue.splice(ricQueue.indexOf(item), 1)
    enqueueTask("idle-timeout", now, `rIC timeout: ${item.label}`, () => {
      log("RIC", `${item.label} (timeout expired -> normal task path, didTimeout = true)`)
      item.run({ didTimeout: true, timeRemaining: () => 0 })
    })
  }
}

function idlePeriodEnd(): number {
  const candidates = [now + IDLE_WINDOW_MS]
  if (frameDirty) candidates.push(nextFrameAt)
  for (const task of taskQueue) candidates.push(task.dueTime)
  return Math.min(...candidates)
}

function runIdlePeriod(): boolean {
  let ranCallback = false
  const end = idlePeriodEnd()
  for (;;) {
    if (ricQueue.length === 0 || now >= end) break
    if (taskQueue.some((task) => task.dueTime <= now)) break
    const item = ricQueue.shift()
    if (!item) break
    ranCallback = true
    log("RIC", `${item.label} (idle period, timeRemaining ${Math.max(0, Math.round(end - now))}ms)`)
    item.run({ didTimeout: false, timeRemaining: () => Math.max(0, end - now) })
    performMicrotaskCheckpoint()
  }
  return ranCallback
}

/* ==================== driver ==================== */

function nextEventTime(): number | null {
  const candidates: number[] = []
  for (const task of taskQueue) candidates.push(task.dueTime)
  for (const item of ricQueue) {
    if (item.timeoutDeadline !== null) candidates.push(item.timeoutDeadline)
  }
  if (frameDirty || rafQueue.length > 0) candidates.push(nextFrameAt)
  return candidates.length > 0 ? Math.min(...candidates) : null
}

function drive(): void {
  for (let guard = 0; guard < 500; guard++) {
    promoteExpiredIdleCallbacks()

    const task = pickEligibleTask()
    if (task) {
      taskQueue.splice(taskQueue.indexOf(task), 1)
      log("TASK", `[${task.source}] ${task.label}`)
      task.run()
      performMicrotaskCheckpoint()
      continue
    }

    if ((frameDirty || rafQueue.length > 0) && now >= nextFrameAt) {
      updateTheRendering()
      nextFrameAt = Math.max(nextFrameAt + FRAME_MS, now + FRAME_MS)
      continue
    }

    if (ricQueue.length > 0 && runIdlePeriod()) continue

    const next = nextEventTime()
    if (next === null) return
    now = Math.max(now, next)
  }
  throw new Error("Simulation exceeded its step limit before all work completed")
}

/* ==================== demo ==================== */

function demo(): void {
  console.log(`event loop simulator
  run: node docs/browser/core/eventLoop/simulator.ts
  model: virtual time, a fixed 16.7ms frame interval, input-first selection among ready tasks

scenario:
  - initial script schedules microtasks, a timer, a network response, rAF, rIC, and an observation
  - a 50ms synchronous task delays a click arriving at virtual t=20ms
  - the trace separates geometry observation from the later IntersectionObserver task

read the trace:
  [t=...] is virtual time, not elapsed wall time
  TASK/MICRO: task execution and microtask checkpoints
  DOM/RENDER/RAF: invalidation, rendering work, and animation callbacks
  IO/RIC: observer notification and idle callbacks, including timeout delivery

limits:
  - ready-task priority and frame timing are demo policies, not browser guarantees
  - no real DOM, fetch, timers, painting, or browser processes are created
  - walkthrough: docs/browser/core/eventLoop/simulator.md

trace:`)

  // Task 1: initial page script. While it runs, nothing else can run.
  enqueueTask("script", 0, "initial page script", () => {
    log("RUN", "script: sync start")
    domWrite("#box text changed")
    readLayoutAfterWrite()

    scheduleTimer("setTimeout(fn, 0)", 0, () => {
      log("RUN", "timer callback runs (delay only makes it eligible, not punctual)")
    })

    microtask("Promise.then", () => {
      log("RUN", "promise .then runs inside the checkpoint")
    })
    microtask("queueMicrotask()", () => {})
    mutateDom("childList mutation on #list")

    requestAnimationFrame("rAF #1", () => {
      log("RUN", "rAF #1: writes visual state before paint")
      requestAnimationFrame("rAF #2 (registered inside #1)", () => {})
    })

    requestIdleCallback("rIC without timeout", (deadline) => {
      log(
        "RUN",
        `background chunk during idle period (${Math.round(deadline.timeRemaining())}ms left)`
      )
    })
    requestIdleCallback(
      "rIC with timeout 20ms",
      (deadline) => {
        log("RUN", `background chunk via ${deadline.didTimeout ? "timeout path" : "idle period"}`)
      },
      20
    )

    observeIntersection("#box enters viewport")

    simulateNetworkResponse("fetch /api/data", 40, () => {
      log("RUN", "networking task: response arrived, fetch promise fulfills")
      microtask("Promise.then of fetch()", () => {
        log("RUN", ".then reaction runs in the checkpoint after that task")
      })
    })

    blockMainThread("long task (heavy computation)", 50)
    log("RUN", "script: sync end")
  })

  // A click happens at 20ms while the script task above is still running.
  enqueueTask("user-interaction", 20, "click on #save", () => {
    log("RUN", "click listener runs (input waited for the current task + microtasks)")
  })

  drive()
}

demo()
export {}

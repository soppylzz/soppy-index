---
name: knowledge-demo
description: Create or revise runnable knowledge demos and Chinese walkthroughs, including browser labs and Node CLI experiments. Algorithm examples use their own conventions.
---

# Knowledge Demos

Read `AGENTS.md`, relevant rules, the target note/references, and a nearby demo. The shared source is exposed through `.claude/skills` for Claude Code.

## Choose the experiment

Use a few comparisons with one control variable each, predicting an observable result and explaining its cause. Browser mechanisms must run in the real browser; simulation must be labeled and cannot prove browser behavior.

Examples: `docs/browser/storage/webStorage/index.ts` (steps/events), `docs/browser/cache/index.ts` (routes/headers), `docs/browser/core/eventLoop/simulator.ts` (explicit simulation limits).

## Contracts and implementation

- Notes labs prefer directly runnable erasable TS and `node:http`; add dependencies/build steps only for the topic. Small browser scripts may stay inline; avoid unnecessary frameworks/assets. Workspace implementations and playgrounds follow existing `packages/` / `internals/` boundaries and scripts.
- Before browser HTTP work, read [docs/demo](../../../docs/demo/README.md) and its relevant helpers. Reuse server/logger/assets/classes; serve shared assets on every origin, and keep topic geometry/protocol code local. Follow loading/lifecycle inline-style and recorder exceptions so infrastructure does not alter measurements.
- Node CLI labs read [docs/node](../../../docs/node/README.md), reuse bounded runner/logger helpers, and own process/stream/worker/file cleanup. CSS topics use [docs/css](../../../docs/css/README.md) with text/snippets rather than labs.
- Keep shared contracts in their READMEs. Contract changes require updating their documentation and validating callers in the same task; do not copy contracts into harness files.
- Use explicit `.ts` extensions for native imports. Follow [code](../../rules/code.md) for English comments/CLI text and Chinese browser teaching text. Use semantic HTML, descriptive controls, `textContent`, bounded delays, known routes, correct MIME types, and useful errors.
- Bind explicit localhost ports; report conflicts and shutdown. Keep server plumbing secondary to the lesson.

## Timing and evidence

For loading experiments, delay HTTP responses, not script-local timers, to control availability. Busy loops are only for demonstrating main-thread blocking. Separate requests/response completion from JS execution; explain cache/DevTools effects. Dynamically inserted scripts need attributes before insertion; resource-hint experiments compare matching URLs/fetch settings and whether cache reuse is possible.

Record relevant event names, timestamps, `readyState`, DOM availability, request logs, or resource timing. Exact timings and cross-source order are observations, not guarantees. Server receipt does not prove browser execution.

## Runtime guidance

After a successful HTTP listen, print the demo name, reachable URLs, experiments/topics, short action sequence, observation locations, stop instruction, and relevant host/cache conditions. Derive URLs/modes from actual configuration; no success banner after bind failure. Separate concise server logs from browser lifecycle/execution logs. Check interpolated startup labels for English too.

CLI simulators introduce purpose/log notation when useful and show their full trace; algorithms retain their own demo/footer convention. Longer theory belongs in walkthroughs, not startup comments.

## Walkthrough and checks

READMEs provide navigation, prerequisites, commands, URL/port, and shutdown. Pair `index.ts` with `index.md`; otherwise match script/walkthrough names (e.g. `simulator.ts` / `simulator.md`). Use descriptive topic filenames for deeper notes. Include short mechanism-focused excerpts, link full code, and identify omitted helpers/cleanup/error handling.

Map each experiment to actions, predicted observation, and cause; state exclusions and timing conditions. Mark illustrative traces; publish actual output only after observing it.

Run appropriate TS/ESLint/Prettier checks. Start servers and verify startup text, URLs, response types, delays, endpoints, cleanup, and bind-failure behavior. Inspect stdout/stderr and browser errors/events. Verify central behavior in a real browser when available, with automation dependencies/profiles outside the repository; otherwise report the limit and provide manual steps, never mark predictions verified. For CLI-only experiments, inspect the complete trace.

Check links and commands after moves. Preserve unrelated work, avoid implementation-mirroring snapshots, and report actual checks and limits.

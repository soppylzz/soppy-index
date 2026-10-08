---
name: knowledge-demo
description: Create or revise runnable knowledge-point demos and their Chinese walkthroughs in this interview repository, especially browser labs. Use for teaching observable mechanisms; algorithm implementations retain their own conventions.
---

# Knowledge-point demos

Read `AGENTS.md` and the relevant shared rules from the repository root. This skill is ordinary Markdown linked from the shared guide. Clients may use their native discovery where supported; Claude Code reads this file on demand through `AGENTS.md`, without a registered slash command.

## Match the experiment to the mechanism

Read the target note, its references, and a nearby demo first. Existing references from the repository root:

- `docs/browser/storage/webStorage/index.ts` and its README: a self-contained `node:http` browser lab with Chinese steps, cards, tables, and an event log.
- `docs/browser/cache/index.ts` and its README: one server, multiple focused routes, explicit response headers.
- `docs/browser/core/eventLoop/simulator.ts` and `simulator.md`: a virtual-clock simulator with explicit simplifications. Use simulation only when that is the intended teaching model; do not claim it proves browser behavior.

Choose a small set of experiments where each predicts an observable result and explains its cause. Keep one control variable per comparison where practical. For browser-native parsing, loading, storage, or lifecycle behavior, let the real browser perform the work rather than faking its output with timers.

## Local lab conventions

Prefer a self-contained `index.ts`, Node >= 22.18, and built-in `node:http`; avoid new dependencies or build steps unless the topic needs them. Small browser scripts may live in HTML strings. Split assets into files only when it makes the mechanism easier to inspect. Follow existing typography: a readable centered page, simple cards/tables, muted hints, and chronological logs; no app framework is needed.

Use Chinese UI instructions and English source comments. Give controls descriptive labels, use semantic HTML, and write log messages with `textContent`. Keep server plumbing secondary to the lesson. Use an explicit localhost port, report address conflicts clearly, and document shutdown. Bound user-controlled delays and serve known routes with correct MIME types and useful errors.

For loading experiments, delay HTTP responses to control resource availability; do not substitute `setTimeout` inside a script for slow fetching. Reserve busy loops for explicitly demonstrating main-thread execution blocking. Separate the time a request starts/finishes from the time JavaScript executes. Explain cache behavior and what DevTools changes affect the experiment.

Record enough evidence for the question: event name, timestamp, `readyState`, DOM availability, request log, or resource timings. Exact milliseconds and cross-source event ordering are observations, not promises. If inserting scripts dynamically, set attributes before insertion. If demonstrating resource hints, compare a matching resource URL and fetch settings and explain whether cache reuse is enabled.

## Terminal startup guidance

HTTP demos must print a compact guide when the server is successfully listening, following the storage labs. Include the demo name, reachable URL(s), important experiment entrypoints or topics, a short sequence of actions, where to observe results, and how to stop the process. Mention conditions that change the experiment, such as host selection or DevTools cache settings. Keep URLs and available modes consistent with the actual configuration; derive them from shared values where practical. Do not print a success banner before a failed bind.

Distinguish server request/response logs from browser execution and lifecycle logs. Do not imply that a received request proves script execution. Keep request logs concise enough that the experiment remains readable. A CLI-only simulator should introduce its purpose and log notation where useful; it does not need HTTP URLs or browser steps. Algorithm demos retain their existing output conventions.

Follow [code-style](../../rules/code-style.md) for output language: all CLI text must be English; browser teaching UI and logs may remain Chinese. Check interpolated labels as well as literal strings, especially when startup guides reuse browser experiment metadata. Terminal text is runtime guidance, not a code comment. Keep comments sparse, names descriptive, and section dividers semantic. Avoid adding explanatory comments to each startup log line; keep the longer theory in the walkthrough.

## Walkthrough and validation

Put the start command, URL/port, stop instruction, and prerequisites in the local README. Map each experiment to operation, predicted observation, and mechanism. Link deeper theory and state important exclusions. Mark illustrative traces as illustrative; publish actual output only after observing it.

Run a focused TypeScript check, ESLint, and Prettier as appropriate. Start the server and check its startup guide, relevant endpoints, response types, delays, and error paths. Confirm the displayed URLs match the active port, and that a bind failure reports the error without a success banner. Inspect actual stdout/stderr from startup and representative request/error paths for English output; a CLI-only simulator also needs its full trace checked. Validate the central behavior in a real browser when available: inspect execution/event logs and browser errors rather than only HTTP status. Temporary automation dependencies and profiles should stay outside the repository. If a browser is unavailable, report that limit and provide manual steps; never label predicted behavior as verified.

Check relative Markdown links and run commands after moves. Do not repair unrelated files or generate snapshots that merely duplicate implementation. Report what changed, checks actually run, and remaining limits.

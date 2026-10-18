# Teaching Code

Apply to demo implementations, teaching packages, and fenced examples. The learner writes exercise solutions; these conventions do not authorize solving exercises for them.

## Readable mechanisms

- Keep the concept being taught visible in the code. Prefer explicit steps and small, well-named functions over abstraction that hides the mechanism.
- Use types to express meaningful states and constraints. Handle failures at useful boundaries with actionable errors; do not conceal failure behind successful-looking fallback output.
- Separate independent responsibilities when this clarifies the example. Introduce helpers or dependencies when they remove distracting infrastructure, not merely because code repeats.
- Remove dead code rather than commenting it out. Preserve existing behavior outside the task.
- Use English identifiers, comments, UI text, logs, and errors. Keep the accompanying knowledge explanation in Chinese.

## Runtime and evidence

For directly runnable TypeScript, use erasable syntax and explicit runtime-compatible `.ts` imports. Prefer existing repository infrastructure; browser HTTP demos read [shared demo contracts](../../docs/demo/README.md), and Node experiments read [Node guidance](../../docs/node/README.md).

Use real browser mechanisms when teaching browser behavior; label simulations and their limits. For loading experiments, control availability with delayed HTTP responses rather than script-local timers. Set dynamic script attributes before insertion. Keep recorders and shared assets from changing the behavior being measured.

Record enough evidence to explain the result without flooding output. Response completion, server receipt, and JavaScript execution are different events. Exact timings and cross-source ordering are observations unless a specification guarantees them.

## Checks

Teaching packages, including the compiler, need behavior-focused tests for their meaningful contracts and failure cases. Keep the implementation as readable as other demos; package structure does not justify unnecessary production infrastructure.

For browser labs, verify endpoints and central behavior in a real browser when available. Check startup URLs, response types, cleanup, and relevant failure paths. Bind explicit localhost ports and report conflicts; print success only after listening. Keep startup guidance concise. For CLI demos, inspect the complete trace. Report unverified behavior honestly.

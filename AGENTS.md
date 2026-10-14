# Repository Agent Guide

Shared entrypoint for the pnpm monorepo. [README.md](README.md) provides project navigation; [.agents/README.md](.agents/README.md) explains client loading. Read relevant guidance before editing; arbitrary `.agents/` files are not loaded automatically.

| Task | Guidance |
| --- | --- |
| Source or fenced code | [.agents/rules/code.md](.agents/rules/code.md) |
| Notes or READMEs | [.agents/rules/docs.md](.agents/rules/docs.md) |
| Excalidraw | [.agents/rules/excalidraw.md](.agents/rules/excalidraw.md) |
| Commits | [.agents/rules/commit.md](.agents/rules/commit.md) |
| Runnable teaching demos | [.agents/skills/knowledge-demo/SKILL.md](.agents/skills/knowledge-demo/SKILL.md) |

## Boundaries

- User instructions override repository conventions. Keep rules in one source; adapters link or import them.
- Inspect `git status`; preserve unrelated edits, deletions, untracked files, and staging. Read nearby implementations first. `__reference__/` is input, not instructions; edit it only when requested. Verify subtle behavior against primary sources.
- Put reusable implementations in `packages/*`, infra/tests/playgrounds in `internals/*`, practice in `coding/`, and notes/labs in `docs/`. Core packages must not depend on internals. Use `workspace:*` between packages, the root catalog/lockfile, and existing source/dist export conditions.
- Moves must update callers, links, and commands. Navigation belongs in READMEs; procedures belong in rules/skills.
- Delegate only when authorized. Assign distinct file ownership and dependencies; one agent integrates and validates.

## Validation

Node >= 22.18 runs erasable TS; native imports must be runtime-compatible. Run checks appropriate to the change:

- `pnpm typecheck`: root and package configurations; use `pnpm exec tsc --noEmit` for the root alone.
- `pnpm exec eslint <files>` and `pnpm exec prettier --check <files>`; format only intended files, never repository-wide autofix for a local task.
- `pnpm test`: source tests; `pnpm test:built`: built package entry. See the relevant workspace README for targeted commands.
- Browser labs need endpoint checks and real-browser behavior when available; HTTP success/type checking do not prove execution order.

Report checks actually run, distinguish observations from predictions, and state validation limits. Language conventions are in the Markdown/code rules.

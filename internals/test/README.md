# @soppy-index/test

Shared test runner for the learning workspaces.

Uses tinyglobby to discover `<topic>/*.test.ts` and execa to run Node's native test runner. Tests import workspace APIs with the `development` condition; `pnpm test:built` separately checks the default compiled entry. Subprocesses have bounded execution, and fixtures clean up their resources.

From the repository root, run `pnpm test`, `pnpm test:compiler`, or a focused suite such as `pnpm --filter @soppy-index/test test compiler/maps`. Watch and coverage modes are not implemented. See the [validation notes](../../packages/compiler/docs/validation.md).

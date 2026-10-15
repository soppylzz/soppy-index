# @soppy-index/test

Shared test discovery and fixture helpers for the learning workspaces.

Tests live in each workspace's `__test__/` directory. Uses tinyglobby to discover `packages/*/__test__/**/*.test.ts` and `internals/*/__test__/**/*.test.ts`, then execa to run Node's native test runner with the `development` condition. Helpers bound subprocess execution, write fixtures, and clean up resources. This workspace has no dependency on the packages under test.

From the repository root, run `pnpm test`, `pnpm test:compiler`, or `pnpm --filter @soppy-index/compiler test maps` for a focused suite. The runner accepts a workspace directory name and optional suite prefix. No match fails explicitly. `pnpm test:built` builds the compiler and runs its own `__test__/built.ts` without the development condition. Watch and coverage modes are not implemented. See the [validation notes](../../packages/compiler/docs/validation.md).

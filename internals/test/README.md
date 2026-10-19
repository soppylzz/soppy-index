# @soppy-index/test

Shared fixture helpers for Vitest tests in the learning workspaces. Tests stay in each workspace's `__test__/` directory. Helpers create temporary files, register cleanup with `onTestFinished`, and bound subprocess execution. This workspace does not depend on the packages under test.

Run `pnpm test` from the repository root for all configured workspace unit tests, including coding exercises, the compiler, playground, and demos. Run `pnpm test` inside the relevant workspace to narrow the run; append `maps` in `packages/compiler/` for the mapping suite. The root config discovers demo projects with `docs/**/demo/vitest.config.ts`. `pnpm test:watch` watches all configured projects. Production HTML and HTTP suites use each demo's `test:ui` and `test:http` scripts and require the setup described by that demo. The Node native-testing lesson runs independently with `node docs/node/testing/index.ts` and intentionally uses `node:test`.

Inside `packages/compiler/`, `pnpm test:built` builds the compiler with Vite and runs `__test__/built.test.ts`; a fresh Node subprocess verifies the default package and subpath exports without the development condition.

学习工作区共用 Vitest fixture helpers，测试保留在各自的 `__test__/`。临时目录通过 `onTestFinished` 清理，子进程设有超时；根命令与独立集成测试的范围见上文。验证记录见[编译器说明](../../packages/compiler/docs/validation.md)。

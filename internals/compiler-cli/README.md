# @soppy-index/compiler-cli

Internal command-line adapter for `@soppy-index/compiler`.

Uses mri for argument syntax and fs-extra for artifact output. Compiler-specific option validation, output-directory protection, and manifest preservation stay in this adapter; language and module semantics stay in the compiler package.

Run `pnpm compiler --help` from the repository root. Input/output paths are relative to the caller's working directory. See the [compiler walkthrough](../../packages/compiler/index.md) and [infra migration notes](../../packages/compiler/docs/infra-migration.md).

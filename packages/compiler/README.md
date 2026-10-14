# @soppy-index/compiler

A small, handwritten TypeScript-to-JavaScript compiler for studying the compilation pipeline.

Provides scanning, parsing, symbol binding, basic type checking, independent AST transforms, JS emission, source maps, declaration output, and conservative analysis of an acyclic ESM module graph. `compile` handles one file; `loadGraph`, `shake`, and `emitGraph` support module experiments. It implements a documented language subset, not full TypeScript or JavaScript.

Consumed by the internal CLI, tests, and Vite playground. Development exports load source; default exports load `dist` after `pnpm build`. This workspace is private.

See the [project quick start](../../README.md), [Chinese walkthrough](index.md), and [language boundary](docs/language.md).

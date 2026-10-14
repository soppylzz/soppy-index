# Internal Infrastructure

[Project](../README.md)

Following the package/playground separation in soppy-vue, reusable implementations live in `packages/*`; adapters, tests, and experiments live here. Core packages must not depend on internals. Declare each workspace's dependencies explicitly with `workspace:*`; shared third-party versions and installation state belong to the root catalog and lockfile.

| Workspace | Purpose |
| --- | --- |
| [@soppy-index/compiler-cli](compiler-cli/README.md) | Argument handling and compiler artifact output |
| [@soppy-index/test](test/README.md) | Test discovery, fixtures, and bounded execution |
| [@soppy-index/play-compiler](play-compiler/README.md) | Examples, CLI experiments, and real Vite integration |

The existing [Auth lab](../docs/auth/demo/README.md) remains under `docs/auth/demo` and participates in the root workspace. `pnpm build` builds package implementations; playground builds have separate commands. `pnpm typecheck` checks root/package/infra configurations, while `pnpm auth:typecheck` checks the Auth application separately.

Source tests use the `development` export condition; `pnpm test:built` builds and checks default exports. Keep implementation output, compiler-generated examples, and browser bundles in their owning workspace's `dist` directory.

## Adding a learning topic

Use `packages/<topic>`, `internals/play-<topic>`, and `internals/test/<topic>`. Workspace globs and test discovery already support this layout. Planned bundler, React, and JSX topics are not implemented yet; add dependencies and shared abstractions only when real reuse requires them. A React runtime need not depend on a TS checker, and JSX needs its own explicit syntax boundary.

## Git and package versions

Husky runs [lint-staged](../lint-staged.config.mjs) before commits and [commitlint](../commitlint.config.mjs) on commit messages. Installation sets up the local hooks; commit conventions are in the [shared rule](../.agents/rules/commit.md).

```bash
pnpm changeset
pnpm changeset:status
pnpm version:packages
pnpm install --lockfile-only
```

Changesets records version intent; `version:packages` consumes it to update versions and changelogs. Review those changes and the updated lockfile before committing. The [configuration](../.changeset/config.json) versions the private compiler and ignores internal tools and the Auth lab; no automatic commit, tagging, or npm publication is configured.

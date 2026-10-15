# Internal Infrastructure

[Project](../README.md)

Reusable implementations live in `packages/*`; adapters, shared infrastructure, and experiments live here. Tests belong to their owning workspace's `__test__/` directory. Core runtime code must not depend on internals; tests may use shared helpers. Declare each workspace's dependencies explicitly with `workspace:*`; shared third-party versions and installation state belong to the root catalog and lockfile.

| Workspace | Purpose |
| --- | --- |
| [@soppy-index/test](test/README.md) | Shared test discovery, fixture helpers, and bounded execution |
| [@soppy-index/play-compiler](play-compiler/README.md) | Examples, direct compiler API experiments, and real Vite integration |

The existing [Auth lab](../docs/auth/demo/README.md) remains under `docs/auth/demo` and participates in the root workspace. `pnpm build` builds package implementations; playground builds have separate commands. `pnpm typecheck` checks root/package/infra configurations, while `pnpm auth:typecheck` checks the Auth application separately.

Source tests use the `development` export condition; `pnpm test:built` builds and checks default exports. Keep implementation output, compiler-generated examples, and browser bundles in their owning workspace's `dist` directory.

## Adding a learning topic

Use `packages/<topic>` and `internals/play-<topic>`, with `__test__/*.test.ts` beside each workspace's source directory. Test helpers are a dev dependency, and each tested workspace exposes a `test` script. Workspace globs and shared discovery support this layout. Planned bundler, React, and JSX topics are not implemented yet; add dependencies and shared abstractions only when real reuse requires them. A React runtime need not depend on a TS checker, and JSX needs its own explicit syntax boundary.

## Git and package versions

Husky runs [lint-staged](../lint-staged.config.mjs) before commits and [commitlint](../commitlint.config.mjs) on commit messages. Installation sets up the local hooks; commit conventions are in the [shared rule](../.agents/rules/commit.md).

```bash
pnpm changeset
pnpm changeset:status
pnpm version:packages
pnpm install --lockfile-only
```

Changesets records version intent; `version:packages` consumes it to update versions and changelogs. Review those changes and the updated lockfile before committing. The [configuration](../.changeset/config.json) versions the private compiler and ignores internal tools and the Auth lab; no automatic commit, tagging, or npm publication is configured.

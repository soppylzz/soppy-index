# Git Commit Conventions

Applies when a user requests a commit or another authorized workflow requires one. Follow the repository's existing English Conventional Commits style.

## Message format

Use `type: summary` with a concise English imperative summary describing the final change. Existing commits omit scopes; keep that form unless the user requests otherwise.

- `feat`: add a capability or runnable experiment.
- `fix`: correct behavior.
- `docs`: change notes, walkthroughs, or navigation without changing runtime behavior.
- `refactor`: reorganize implementation while preserving behavior.
- `chore`: maintain configuration, tooling, ignore patterns, or agent guidance.

For a substantial change, leave a blank line after the subject and add short English bullets explaining the outcome and relevant validation. Describe the final implementation rather than the conversation or abandoned approaches. Do not claim checks that were not run. Include attribution trailers only when the contributor identity is known and applicable; never copy another agent's identity from history.

## Scope and staging

Inspect status, staged changes, diffs, and recent commit messages before staging. Identify the work authorized by the conversation and preserve unrelated changes, deletions, untracked files, and any existing staging. A request to commit the current work does not authorize sweeping unrelated workspace changes into it.

Group changes by coherent purpose. Keep moves with their direct links, callers, and run instructions. Stage explicit paths or selected hunks; avoid blanket staging in a mixed worktree. If intended and unrelated edits share a file, inspect the hunks and stage only the intended work when it can be separated safely.

Review the complete staged diff and run appropriate checks before committing. Do not bypass hooks or verification to force a commit. Afterward, inspect the commit and remaining status, then report the hash, subject, checks, and any material work left uncommitted.

Commit authorization does not imply permission to push, amend existing commits, rewrite history, or remove unrelated work. Follow explicit session authorization for those actions.

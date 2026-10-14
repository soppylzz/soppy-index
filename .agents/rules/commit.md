# Git Commits

Apply only when a commit is authorized. Use the existing English Conventional Commits form `type: summary`, without scope unless requested; summaries are concise and imperative.

| Type     | Change                             |
| -------- | ---------------------------------- |
| feat     | Capability or runnable experiment  |
| fix      | Behavior correction                |
| docs     | Notes, walkthroughs, navigation    |
| refactor | Reorganization preserving behavior |
| chore    | Tooling, configuration, guidance   |

Substantial commits may add a blank line and short English bullets describing the final outcome and actual validation. Omit abandoned approaches; add attribution only for a known contributor, never copy another agent's identity.

Before staging, inspect status, existing staging, diffs, and recent messages. Group coherent changes; keep moves with callers/links/commands. Stage explicit paths or selected hunks, preserving unrelated work. A commit request is not permission to sweep a mixed worktree into one commit.

Review the full staged diff and run relevant checks. Do not bypass hooks. Inspect the resulting commit and remaining status; report hash, subject, checks, and uncommitted work. Commit authorization does not authorize push, amend, history rewrites, or deleting unrelated work.

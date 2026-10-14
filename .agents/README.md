# Shared Agent Harness

[Project](../README.md) · [Entry guide](../AGENTS.md)

`AGENTS.md` routes tasks to shared rules and skills. `.agents/` is ordinary Markdown: clients must discover it or read the linked files explicitly. Rules hold conventions, skills hold workflows, and READMEs hold navigation; do not duplicate their content.

[CLAUDE.md](../CLAUDE.md) imports the entry guide and loads task-specific files on demand. [.claude/rules](../.claude/rules) and [.claude/skills](../.claude/skills) are relative symlinks to the shared directories; edit their `.agents/` sources. [.claude/settings.json](../.claude/settings.json) contains shared client settings and allowed local checks. Keep models, credentials, personal connections, and overrides in user settings or ignored local files (`.claude/settings.local.json`, `CLAUDE.local.md`).

The workspace layout is described in [internals/README.md](../internals/README.md); the root scripts use pnpm. When changing guidance, check adapter imports, relative links, skill frontmatter, and settings consistency:

```bash
pnpm exec prettier --check AGENTS.md CLAUDE.md .agents .claude/settings.json
```

Structural checks do not prove that a client loaded instructions. In Claude Code, inspect `/memory` and `/permissions`; use `claude doctor` for setup issues and start a fresh session after loading changes. `acceptEdits` governs edits, not blanket command approval.

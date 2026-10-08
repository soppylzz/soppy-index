# 共享 Agent Harness

[返回仓库首页](../README.md)

本目录维护跨客户端共用的规则与技能。根目录 `AGENTS.md` 是唯一共享入口，`CLAUDE.md` 负责 Claude Code 的加载适配。

## 结构与职责

| 位置                                                               | 职责                                 | 加载方式                                   |
| ------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------ |
| [AGENTS.md](../AGENTS.md)                                          | 任务路由、工作边界和验证约定         | 支持该约定的客户端读取；其他客户端显式读取 |
| [rules/code-style.md](./rules/code-style.md)                       | 命名、代码注释与算法 demo 规范       | 编写代码前读取                             |
| [rules/markdown-docs.md](./rules/markdown-docs.md)                 | 中文笔记、README 与算法主题结构      | 编写文档前读取                             |
| [rules/excalidraw-diagrams.md](./rules/excalidraw-diagrams.md)     | 可编辑图示、颜色、备份与导出         | 创建、修改或审阅图示时读取                 |
| [rules/git-commits.md](./rules/git-commits.md)                     | 提交格式、范围、暂存与验证           | 准备 Git 提交时读取                        |
| [skills/knowledge-demo/SKILL.md](./skills/knowledge-demo/SKILL.md) | 教学实验的设计、CLI 引导、观测与验证 | 编写知识点 demo 或配套说明时读取           |
| [CLAUDE.md](../CLAUDE.md)                                          | 导入共享入口与常用规则               | Claude Code 原生加载                       |
| [.claude/settings.json](../.claude/settings.json)                  | Claude Code 项目设置                 | Claude Code 原生加载                       |

规则描述跨任务约束，skill 描述具体工作流程，README 负责使用与导航。新增内容按职责归档；同一条规则只维护一份。`.agents/` 的名字本身不保证任何客户端加载所有文件，以其发现机制和本仓库入口为准。

## Demo 编写约定

浏览器实验的设计、启动引导和验证流程见 [knowledge-demo skill](./skills/knowledge-demo/SKILL.md)，代码与输出语言见 [code-style](./rules/code-style.md)。公共样式与工具的接口契约集中在 [docs/demo](../docs/demo/README.md)，skill 会引导后续 session 读取；此处只保留导航。

## Claude Code 兼容方式

`CLAUDE.md` 使用 `@` 导入共享入口、代码风格和 Markdown 规则；图示规则与 demo skill 由入口指示按需读取。导入路径相对 `CLAUDE.md` 解析，这是 Claude Code 的[文件导入机制](https://code.claude.com/docs/en/memory#import-additional-files)。

Claude Code 原生项目 skill 位于 `.claude/skills/`，不会因本仓库使用 `.agents/skills/` 就自动注册 `/knowledge-demo`。为保持 `.claude/` 只存 settings，本仓库通过共享入口读取 skill。可以直接要求“按 `.agents/skills/knowledge-demo/SKILL.md` 编写实验”。若以后需要 slash command，应增加薄适配层，并继续让共享 skill 作为正文来源。参见[官方 skill 目录说明](https://code.claude.com/docs/en/skills#choose-where-skills-load)。

## 项目设置

共享设置包含：简体中文回复、`acceptEdits` 文件编辑模式、现有 Node 运行权限，以及搜索、Git 查看、lint、类型检查和格式化命令的授权。检查工具使用 `npx --no-install`，依赖来自本地安装。`acceptEdits` 自动接受文件编辑，其他命令仍按实际权限规则处理；详见[Claude Code permissions](https://code.claude.com/docs/en/permissions)。

模型、凭证、个人工具连接与个人权限应放在用户设置或 `.claude/settings.local.json`。本仓库已忽略该本地文件和 `CLAUDE.local.md`；不在共享配置中固定个人模型或机器路径。配置作用域见[官方 settings 文档](https://code.claude.com/docs/en/settings#settings-files-and-who-they-affect)。

在仓库根目录启动 Claude Code，通过 `/memory` 查看导入文件，通过 `/permissions` 查看权限；`claude doctor` 检查配置问题。迁移后开启新会话以核对加载状态。

## 维护与检查

修改路径时同步检查 `AGENTS.md`、`CLAUDE.md`、规则/skill 的相对链接与相关 README。普通文档更新不需要改写整个 harness；新客户端优先增加入口适配，避免复制规则正文。

格式检查示例：

```bash
npx --no-install prettier --check AGENTS.md CLAUDE.md .agents .claude/settings.json
```

检查 Markdown 本地链接是否存在、settings 是否符合 schema，以及 skill 的 frontmatter 和引用是否完整。行为验证应围绕真实任务；不要把结构检查当作客户端已经成功加载全部内容的证据。

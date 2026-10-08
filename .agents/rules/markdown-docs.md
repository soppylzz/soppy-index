# Markdown Study Notes Language

Applies to Markdown study notes written in this repository for interview preparation.

## Write notes in Simplified Chinese

Knowledge-point notes and explanations are written in Simplified Chinese so they are easy to review before an interview.

## Exception: code inside fenced blocks

Comments inside code samples still follow the English rules in `code-style.md`.

## Math, complexity & symbols

- Display math formulas use `$$ ... $$` (LaTeX).
- Time/space complexity is always inline code, plain ASCII, no inner spaces: `O(nlogn)`, `O(nlogK)`, `O(n^2)`.
- Stick to easy-to-type symbols: `<=` / `>=`, never `≦` / `≤` / `≥` or superscripts like `²` (write `n^2`).
- Bold sparingly: reserve strong emphasis for the few truly important terms, not routine highlighting.

## Topic notes (`algorithm/structure/*/README.md`, `algorithm/special/*/README.md`)

For `algorithm/structure/`, use the following shape, modeled on `heap/` and `priorityQueue/`:

- Title `# EnglishName（中文名）`, then a single blockquote line saying what the structure is (complexities as inline code).
- Exactly four numbered sections:
  1. `定义与性质` — definition, invariants, complexity summary
  2. representation or implementation choice — `数组表示` / `实现选型` / `工作过程` …, whichever fits
  3. `核心操作` — table with pure-English operation names (复杂度 column in inline code); short bullets after it only for non-obvious mechanics
  4. `应用场景` — table of use cases with a 要点 column
- Never add "手写实现", "语言内置" or "对应题目" sections — implementation lives in `index.ts`.
- `algorithm/special/` topics are in-depth method notes, not quick references: section 1 `定义与性质`, then one numbered section per solution method — each with its derivation, a concrete worked-example table (real numbers walked through step by step), complexity and reconstruction — then `方法对比`, then `变体与应用` (e.g. LIS: 方法一 DP, 方法二 patience sorting).
- Operation / algorithm names stay pure English (heapify, siftUp, offer); Chinese carries the explanation prose.
- Prefer tables for enumerable facts, blockquotes (`>`) for asides and intuitions.

## Exempt files

Machine-facing control files (`AGENTS.md`, the `CLAUDE.md` adapter, and guidance under `.agents/`) are exempt and use whichever language best serves their audience.

## Browser notes

Organize around causal relationships and observable behavior; the algorithm four-section template does not apply. Distinguish specification guarantees, implementation choices, and demo observations. Link related notes instead of repeating their full explanations. When renaming or moving a note, update links and run commands in the affected local index.

Demos and walkthroughs follow [knowledge-demo](../skills/knowledge-demo/SKILL.md). Keep actual observations separate from predictions; include conditions when order or timing is not guaranteed.

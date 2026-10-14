# Markdown Conventions

- Study notes and walkthroughs use Simplified Chinese. Package/workspace READMEs use concise English. Root `README.md` / `README.zh-cn.md` are aligned English / Chinese entrypoints. Harness prose is English.
- Fenced code follows [code](code.md), including English comments.
- Display math uses `$$ ... $$`. Complexity is inline, ASCII, without spaces: `O(nlogn)`, `O(n^2)`. Use `<=` / `>=`, not Unicode inequality/superscript variants.
- Bold sparingly. Prefer tables for comparable facts and blockquotes for short intuitions.

## Practice notes

For `coding/structure/*/README.md`, use:

1. Title `EnglishName` with its Chinese name, then one definition blockquote (complexity inline).
2. Exactly four numbered sections: definition/properties; representation or implementation choice; core operations; applications. Write headings in Chinese.
3. Operations table: English operation names and inline complexity; add bullets only for non-obvious behavior. Applications use a scenario/key-point table.

Do not add implementation, language-built-in, or LeetCode sections; code belongs in `index.ts`.

For `coding/algorithm/*/README.md`, use definition/properties, one section per method (derivation, worked numerical table, complexity, reconstruction), method comparison, then variants/applications. Keep algorithm/operation names English and explanation Chinese.

## Labs and project docs

Labs follow [knowledge-demo](../skills/knowledge-demo/SKILL.md), not the four-section practice template. Explain causes and observable behavior; distinguish specification guarantees, implementation choices, predictions, and observations. State timing conditions and exclusions, and link related theory instead of repeating it.

Package READMEs briefly describe purpose, APIs, and consumers, linking detailed walkthroughs. Root bilingual READMEs must align commands, links, capabilities, prerequisites, and limitations; do not claim publication without evidence. Keep navigation in READMEs. Moves require link and command updates.

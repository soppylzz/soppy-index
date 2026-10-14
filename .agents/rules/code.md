# Code Style

Applies to source and fenced examples. Use clear English names and comments. Prefer self-explanatory code; comment only constraints or reasoning that names cannot convey.

- Comments: `// ...` or `/** ... */`. Keep embedded browser-script comments English too.
- Expected-output comments may trail non-obvious demo statements. Avoid annotating every line.
- Section dividers are optional, only for distinct semantic blocks:

  ```js
  /* ==================== LEVEL ONE ==================== */
  /* =============== level two =============== */
  ```

## Algorithm examples

`coding/structure/*/index.ts` and `coding/algorithm/*/index.ts` are self-contained. End with `/* ==================== demo ==================== */` and `export {}`; use runtime-compatible imports for direct Node execution. Demos have no interactive input or test framework, and no expected-output comments on `console.log`.

For a function solving a specific LeetCode problem, finish its JSDoc with the exact `https://leetcode.cn/problems/<slug>/` URL.

## Knowledge demos

Follow [knowledge-demo](../skills/knowledge-demo/SKILL.md). All CLI text is English, including startup guides, traces, labels, warnings, and errors. Browser UI, teaching logs, and Console messages may use Simplified Chinese. Check interpolated labels too. Startup instructions belong in runtime output, not comments. HTTP servers do not use the algorithm demo/footer convention.

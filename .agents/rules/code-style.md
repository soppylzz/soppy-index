# Code Style: Comments & Naming

Applies to every source file in the repository (`.js`, `.ts`, etc.).

## Comments must be in English

Never write Chinese inside code comments.

## Comment forms

- Single-line comments: `// ...`
- Multi-line block comments: `/** ... */`
- Use section dividers only to separate distinct semantic blocks — never per statement — and only in these two levels:

  ```js
  /* ==================== LEVEL ONE ==================== */
  /* =============== level two =============== */
  ```

## Prefer no comment over a comment

- Express intent through self-explanatory function/variable names instead of comments; a reader should understand how to call or use something from its name alone.
- Write a comment only where the code cannot make a constraint obvious by itself.
- In runnable examples, annotate a statement's expected output with a trailing single-line comment, e.g. `console.log(typeof str1); // string` — but only where the output is not obvious from the call itself; keep demo comments sparse.

## Algorithm demo sections (`algorithm/structure/*/index.ts`, `algorithm/special/*/index.ts`)

- Each implementation file is self-contained and ends with a `/* ==================== demo ==================== */` section followed by `export {}`, so it stays file-scoped. Direct Node execution also requires a supported Node version and compatible imports.
- Demo code calls the implementation the way an interview solution would; no interactive input, no test framework.
- No expected-output comments on demo `console.log` lines — the printed result is its own documentation. Explanations live on the implementation itself.
- A function solving a specific LeetCode problem carries a JSDoc block whose last line is the leetcode.cn URL:

  ```ts
  /**
   * days until a warmer temperature
   * https://leetcode.cn/problems/daily-temperatures/
   */
  ```

## Browser knowledge demos

Follow [knowledge-demo](../skills/knowledge-demo/SKILL.md) for browser labs; the algorithm demo-section convention does not apply to HTTP servers. All CLI output must use English, including startup guides, simulator traces, request logs, warnings, and errors. Browser UI labels, in-page teaching logs, and browser Console messages may use Simplified Chinese; source comments remain English, including JavaScript embedded in HTML strings. When a CLI guide lists experiments, use English labels or stable mode identifiers rather than interpolating Chinese UI titles. Keep startup guidance in runtime output rather than source comments; use semantic section dividers only when they clarify the file structure.

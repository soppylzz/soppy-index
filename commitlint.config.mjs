export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [2, "always", ["feat", "fix", "docs", "refactor", "chore"]],
    "scope-empty": [2, "always"],
  },
}

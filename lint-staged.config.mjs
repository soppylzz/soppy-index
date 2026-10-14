export default {
  "*.{js,mjs,cjs,jsx,ts,tsx}": ["eslint --fix --max-warnings=0", "prettier --write"],
  "*.{json,jsonc,md,yaml,yml,css,html}": "prettier --write",
}

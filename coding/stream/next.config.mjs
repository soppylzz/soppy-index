import { resolve } from "node:path"

const root = resolve(import.meta.dirname, "../..")

export default {
  agentRules: false,
  turbopack: { root },
  outputFileTracingRoot: root,
}

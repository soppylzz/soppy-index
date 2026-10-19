import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")

export default {
  agentRules: false,
  distDir: process.env.LAB_ROLE === "provider" ? ".next/provider" : ".next/client",
  turbopack: { root },
  outputFileTracingRoot: root,
}

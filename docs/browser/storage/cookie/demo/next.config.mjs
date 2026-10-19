import { fileURLToPath } from "node:url"

const workspaceRoot = fileURLToPath(new URL("../../../../../", import.meta.url))

export default {
  generateEtags: false,
  poweredByHeader: false,
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
  distDir: process.env.LAB_ROLE === "evil" ? ".next-evil" : ".next",
}

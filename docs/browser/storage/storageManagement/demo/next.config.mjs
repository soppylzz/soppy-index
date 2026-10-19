import { fileURLToPath } from "node:url"

const workspaceRoot = fileURLToPath(new URL("../../../../../", import.meta.url))

export default {
  generateEtags: false,
  poweredByHeader: false,
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
}

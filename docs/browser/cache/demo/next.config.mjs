import { fileURLToPath } from "node:url"

const workspaceRoot = fileURLToPath(new URL("../../../../", import.meta.url))

export default {
  generateEtags: false,
  turbopack: { root: workspaceRoot },
  outputFileTracingRoot: workspaceRoot,
}

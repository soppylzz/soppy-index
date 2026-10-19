import { fileURLToPath } from "node:url"

// HTTP helpers resolve lab assets from the workspace working directory.
process.chdir(fileURLToPath(new URL("../", import.meta.url)))

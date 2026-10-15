import fs from "fs-extra"
import { resolve } from "node:path"
/** Keep output policy local; fs-extra only handles JSON I/O and parent directory creation. */
export async function writeArtifacts(
  outDir: string,
  artifacts: Map<string, string>
): Promise<void> {
  const manifest = resolve(outDir, "package.json")
  let existing: unknown
  let found = true
  try {
    existing = await fs.readJson(manifest)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
    found = false
  }
  if (found) {
    if (
      !existing ||
      typeof existing !== "object" ||
      !("type" in existing) ||
      existing.type !== "module"
    )
      throw new Error(
        "Output directory has incompatible package.json; choose a dedicated output directory"
      )
  } else artifacts.set(manifest, JSON.stringify({ type: "module" }) + "\n")
  for (const [file, text] of artifacts) await fs.outputFile(file, text)
}

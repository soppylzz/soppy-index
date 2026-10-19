import assert from "node:assert/strict"
import { execa } from "execa"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import type { TestContext } from "vitest"
export async function fixture(
  context: TestContext,
  files: Record<string, string>
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "mini-compiler-"))
  context.onTestFinished(() => rm(root, { recursive: true, force: true }))
  for (const [name, text] of Object.entries(files)) {
    await mkdir(dirname(join(root, name)), { recursive: true })
    await writeFile(join(root, name), text)
  }
  return root
}
export async function execute(file: string): Promise<string> {
  return (
    await execa(process.execPath, [file], {
      timeout: 5000,
      maxBuffer: 64 * 1024,
      stripFinalNewline: false,
    })
  ).stdout
}

export async function writeFiles(files: ReadonlyMap<string, string>): Promise<void> {
  for (const [file, text] of files) {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, text)
  }
}

export function locate(
  text: string,
  needle: string,
  occurrence = 0
): { line: number; column: number } {
  let offset = -1
  for (let i = 0; i <= occurrence; i++) {
    offset = text.indexOf(needle, offset + 1)
    assert.notEqual(offset, -1, needle)
  }
  const lines = text.slice(0, offset).split("\n")
  return { line: lines.length, column: lines.at(-1)!.length }
}

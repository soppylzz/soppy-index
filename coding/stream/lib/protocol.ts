export type StreamInput = { prompt: string; provider: "mock" | "glm" }
export type StreamMessage =
  { type: "delta"; text: string } | { type: "done" } | { type: "error"; message: string }

export function parseInput(value: unknown): StreamInput {
  if (!value || typeof value !== "object") throw new Error("Expected a JSON object")
  const input = value as Record<string, unknown>
  if (typeof input.prompt !== "string" || !input.prompt.trim() || input.prompt.length > 4000) {
    throw new Error("Prompt must contain 1 to 4000 characters")
  }
  if (input.provider !== "mock" && input.provider !== "glm") {
    throw new Error("Provider must be mock or glm")
  }
  return { prompt: input.prompt.trim(), provider: input.provider }
}

export function parseMessage(data: string): StreamMessage {
  const value: unknown = JSON.parse(data)
  if (value && typeof value === "object") {
    const message = value as Record<string, unknown>
    if (message.type === "done") return { type: "done" }
    if (message.type === "delta" && typeof message.text === "string") {
      return { type: "delta", text: message.text }
    }
    if (message.type === "error" && typeof message.message === "string") {
      return { type: "error", message: message.message }
    }
  }
  throw new Error("Invalid stream message")
}

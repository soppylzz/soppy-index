import { clientOrigin } from "./config.ts"

export function corsHeaders(request: Request): Record<string, string> {
  return request.headers.get("origin") === clientOrigin
    ? {
        "Access-Control-Allow-Origin": clientOrigin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        Vary: "Origin",
      }
    : { Vary: "Origin" }
}

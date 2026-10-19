import { clientOrigin } from "./config.ts"

export const demoOrigin = clientOrigin
export function appUrl(path: string): URL {
  return new URL(path, clientOrigin)
}
export function isSameOriginPost(request: Request): boolean {
  return request.headers.get("origin") === clientOrigin
}

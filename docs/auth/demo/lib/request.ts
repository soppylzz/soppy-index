export const demoOrigin = process.env.AUTH_DEMO_ORIGIN ?? "http://127.0.0.1:3000"

export function appUrl(path: string): URL {
  return new URL(path, demoOrigin)
}

export function isSameOriginPost(request: Request): boolean {
  const origin = request.headers.get("origin")
  return origin !== null && origin === new URL(demoOrigin).origin
}

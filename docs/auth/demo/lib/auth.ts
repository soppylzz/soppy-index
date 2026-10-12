import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

export const demoEmail = "demo@example.test"
export const demoPassword = "correct-horse-battery-staple"
export const sessionCookieName = "auth-demo-session"

const passwordSalt = randomBytes(32)
const passwordHash = scryptSync(demoPassword, passwordSalt, 64)
const sessionLifetimeMs = 30 * 60 * 1000

type Session = { email: string; csrfToken: string; expiresAt: number }
const globalStore = globalThis as typeof globalThis & { authDemoSessions?: Map<string, Session> }
const sessions = (globalStore.authDemoSessions ??= new Map<string, Session>())

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function verifyCredentials(email: string, password: string): boolean {
  const candidate = scryptSync(password, passwordSalt, 64)
  return email === demoEmail && timingSafeEqual(candidate, passwordHash)
}

export function createSession(): { token: string; session: Session } {
  const token = randomBytes(32).toString("base64url")
  const session = {
    email: demoEmail,
    csrfToken: randomBytes(32).toString("base64url"),
    expiresAt: Date.now() + sessionLifetimeMs,
  }
  sessions.set(hashSessionToken(token), session)
  return { token, session }
}

export function getSession(token: string | undefined): Session | undefined {
  if (!token) return undefined
  const key = hashSessionToken(token)
  const session = sessions.get(key)
  if (!session) return undefined
  if (session.expiresAt <= Date.now()) {
    sessions.delete(key)
    return undefined
  }
  return session
}

export function revokeSession(token: string | undefined): void {
  if (token) sessions.delete(hashSessionToken(token))
}

export function matchesCsrf(actual: string, expected: string): boolean {
  const left = Buffer.from(actual)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}

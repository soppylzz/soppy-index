import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

export const demoPassword = "correct-horse-battery-staple"
export const demoUsers = [
  { id: "alice", email: "alice@example.test" },
  { id: "bob", email: "bob@example.test" },
] as const
export const sessionCookieName = "security-lab-session"
const passwordSalt = randomBytes(32)
const passwordHash = scryptSync(demoPassword, passwordSalt, 64)
const sessionLifetimeMs = 30 * 60 * 1000

export type Session = {
  userId: string
  email: string
  csrfToken: string
  expiresAt: number
  source: "password" | "oidc"
  accessToken?: string
}
const globalStore = globalThis as typeof globalThis & {
  securityLabSessions?: Map<string, Session>
}
const sessions = (globalStore.securityLabSessions ??= new Map<string, Session>())

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function verifyCredentials(email: string, password: string) {
  const candidate = scryptSync(password, passwordSalt, 64)
  if (!timingSafeEqual(candidate, passwordHash)) return undefined
  return demoUsers.find((user) => user.email === email)
}

export function createSession(
  userId: string,
  source: Session["source"] = "password",
  accessToken?: string
): { token: string; session: Session } {
  const user = demoUsers.find((item) => item.id === userId)
  if (!user) throw new Error("Unknown subject")
  const token = randomBytes(32).toString("base64url")
  const session: Session = {
    userId,
    email: user.email,
    source,
    accessToken,
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

export const documents = [
  { id: "1", ownerId: "alice", title: "Alice's interview notes" },
  { id: "2", ownerId: "bob", title: "Bob's interview notes" },
]

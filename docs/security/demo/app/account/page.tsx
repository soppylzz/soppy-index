import { Button, Form, Link } from "../ui"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { documents, getSession, sessionCookieName } from "../../lib/auth.ts"

export default async function AccountPage() {
  const session = getSession((await cookies()).get(sessionCookieName)?.value)
  if (!session) redirect("/login")
  return (
    <>
      <h1>Account</h1>
      <p>User: {session.email}</p>
      <p>Authentication source: {session.source}</p>
      <p>Expires: {new Date(session.expiresAt).toISOString()}</p>
      <p>This page is rendered after a server-side session check. Each API checks again.</p>
      <nav>
        {documents.map((doc) => (
          <Link key={doc.id} href={`/api/documents/${doc.id}`}>
            {doc.title}
          </Link>
        ))}
      </nav>
      {session.source === "oidc" && (
        <p>
          <Link href="/api/oauth/resource">Call the provider resource through the BFF</Link>
        </p>
      )}
      <Form action="/api/logout" method="post">
        <input type="hidden" name="csrf" value={session.csrfToken} />
        <Button type="submit">Log out locally</Button>
      </Form>
      <Link href="/api/me">Session identity</Link>
    </>
  )
}

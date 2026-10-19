import { Card, CardContent, Link } from "./ui"

export default function HomePage() {
  return (
    <>
      <h1>Identity and security lab</h1>
      <p>Start with a local session, then compare OAuth client responsibilities.</p>
      <Card>
        <CardContent>
          <h2>Identity and resource authorization</h2>
          <nav>
            <Link href="/login">Password login</Link>
            <Link href="/account">Account</Link>
            <Link href="/api/documents/1">Alice's document</Link>
            <Link href="/api/documents/2">Bob's document</Link>
          </nav>
          <p>An authenticated user can only read their own document.</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h2>OAuth scenarios</h2>
          <nav>
            <Link href="/oauth">Open OAuth experiments</Link>
          </nav>
          <p>Start the local provider on port 3001 before using these experiments.</p>
        </CardContent>
      </Card>
    </>
  )
}

import { Button, Card, CardContent, Form, Link } from "../ui"

export default function OAuthPage() {
  return (
    <>
      <h1>OAuth scenarios</h1>
      <p>Both authorization-code clients use OIDC and PKCE. Their token storage differs.</p>
      <Card>
        <CardContent>
          <h2>Server-side Web / BFF</h2>
          <p>
            The backend exchanges the code and validates the ID token. The browser receives a
            session Cookie.
          </p>
          <Form action="/api/oauth/start" method="post">
            <Button type="submit">Start OIDC + PKCE</Button>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h2>Public SPA</h2>
          <p>
            The browser performs PKCE, validates identity, and calls the API with its own token.
          </p>
          <Link href="/oauth/spa">Open SPA experiment</Link>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h2>Service to service</h2>
          <p>No end-user login: a server uses its client credentials to read jobs.</p>
          <p>
            This local trigger is public for teaching. A real application must authorize who can
            trigger a privileged backend operation.
          </p>
          <Form action="/api/oauth/service" method="post">
            <Button type="submit">Run Client Credentials request</Button>
          </Form>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <h2>Input-constrained device</h2>
          <Link href="/oauth/device">Open Device Authorization experiment</Link>
        </CardContent>
      </Card>
    </>
  )
}

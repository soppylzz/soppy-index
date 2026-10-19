import { Button, Form, Input, Label, TextField, IdentitySelect } from "../../ui"

import { provider } from "../../../lib/provider.ts"
import { demoPassword, demoUsers } from "../../../lib/auth.ts"

export const dynamic = "force-dynamic"
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ transaction?: string }>
}) {
  const { transaction = "" } = await searchParams
  const authorization = provider.authorizations.get(transaction)
  if (!authorization || authorization.expiresAt <= Date.now())
    return <h1>Expired authorization request</h1>
  return (
    <>
      <h1>Local teaching identity provider</h1>
      <p>Client: {authorization.clientId}. Permission: read your documents.</p>
      <p>
        This provider is a deliberately limited local implementation, not a certified identity
        service.
      </p>
      <p>
        Demo password: <code>{demoPassword}</code>
      </p>
      <Form action="/provider/authorize" method="post">
        <input type="hidden" name="transaction" value={transaction} />
        <IdentitySelect emails={demoUsers.map((user) => user.email)} />
        <TextField isRequired>
          <Label>Password</Label>
          <Input name="password" type="password" />
        </TextField>
        <Button type="submit" name="decision" value="allow">
          Authenticate and allow
        </Button>{" "}
        <Button type="submit" name="decision" value="deny">
          Deny
        </Button>
      </Form>
    </>
  )
}

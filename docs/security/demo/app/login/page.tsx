import { Button, Form, Input, Label, Link, TextField } from "../ui"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { demoUsers, demoPassword, getSession, sessionCookieName } from "../../lib/auth.ts"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  if (getSession((await cookies()).get(sessionCookieName)?.value)) redirect("/account")
  const { error } = await searchParams
  return (
    <>
      <h1>Password login</h1>
      <p>Demo users: {demoUsers.map((user) => user.email).join(" / ")}</p>
      <p>
        Shared demo password: <code>{demoPassword}</code>
      </p>
      {error === "invalid" && <p role="alert">Invalid email or password.</p>}
      <Form action="/api/login" method="post">
        <TextField isRequired>
          <Label>Email</Label>
          <Input name="email" type="email" autoComplete="username" />
        </TextField>
        <TextField isRequired>
          <Label>Password</Label>
          <Input name="password" type="password" autoComplete="current-password" />
        </TextField>
        <Button type="submit">Log in</Button>
      </Form>
      <Link href="/">Home</Link>
    </>
  )
}

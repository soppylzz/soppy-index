import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { demoEmail, demoPassword, getSession, sessionCookieName } from "../../lib/auth"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const token = (await cookies()).get(sessionCookieName)?.value
  if (getSession(token)) redirect("/account")
  const { error } = await searchParams
  return (
    <>
      <h1>登录</h1>
      <p>实验账号：{demoEmail}</p>
      <p>实验密码：{demoPassword}</p>
      {error === "invalid" && <p role="alert">账号或密码不正确。</p>}
      <form action="/api/login" method="post">
        <label>
          邮箱
          <input name="email" type="email" required autoComplete="username" />
        </label>
        <label>
          密码
          <input name="password" type="password" required autoComplete="current-password" />
        </label>
        <button type="submit">登录</button>
      </form>
      <a href="/">返回首页</a>
    </>
  )
}

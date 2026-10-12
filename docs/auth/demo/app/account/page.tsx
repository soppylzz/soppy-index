import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getSession, sessionCookieName } from "../../lib/auth"

export default async function AccountPage() {
  const token = (await cookies()).get(sessionCookieName)?.value
  const session = getSession(token)
  if (!session) redirect("/login")
  return (
    <>
      <h1>受保护的账户页</h1>
      <p>当前用户：{session.email}</p>
      <p>会话到期：{new Date(session.expiresAt).toLocaleString("zh-CN")}</p>
      <p>这段内容由服务端组件在确认会话后渲染。地址栏里没有令牌。</p>
      <form action="/api/logout" method="post">
        <input type="hidden" name="csrf" value={session.csrfToken} />
        <button type="submit">退出登录</button>
      </form>
      <a href="/api/me">查看受保护 API 的 JSON</a>
    </>
  )
}

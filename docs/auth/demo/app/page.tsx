import Link from "next/link"

export default function HomePage() {
  return (
    <>
      <h1>登录与会话实验</h1>
      <p>用开发者工具观察表单提交、Set-Cookie、服务端渲染和退出后的会话撤销。</p>
      <nav>
        <Link href="/login">打开登录页</Link>
        <Link href="/account">访问受保护页面</Link>
        <a href="/api/me">访问受保护 API</a>
      </nav>
      <section>
        <h2>观察重点</h2>
        <ol>
          <li>未登录访问账户页会跳转到登录页；API 返回 401。</li>
          <li>登录后的 Cookie 标记为 HttpOnly、SameSite=Lax。</li>
          <li>退出后即使复制旧 Cookie，再请求 API 也得到 401。</li>
        </ol>
      </section>
    </>
  )
}

import type { Metadata } from "next"
import "./styles.css"

export const metadata: Metadata = {
  title: "登录与会话实验",
  description: "Next.js SSR login and session lab",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}

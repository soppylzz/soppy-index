import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./styles.css"

export const metadata: Metadata = {
  title: "HTTP Cache Lab",
  description: "Compare browser cache reuse, validation, and full responses",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="demo-page">{children}</body>
    </html>
  )
}

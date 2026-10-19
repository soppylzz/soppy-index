import type { ReactNode } from "react"
import "./styles.css"

export const metadata = {
  title: "Stream / SSE & WebSocket",
  description: "A streaming typewriter interview demo",
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

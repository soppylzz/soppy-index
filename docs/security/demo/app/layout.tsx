import type { Metadata } from "next"
import "./styles.css"

export const metadata: Metadata = {
  title: "Identity and security lab",
  description: "Next.js sessions, authorization and OAuth experiments",
}
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}

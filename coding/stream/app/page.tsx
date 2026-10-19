import { StreamDemo } from "./stream-demo.tsx"

export const dynamic = "force-dynamic"

export default function Page() {
  return <StreamDemo wsPort={Number(process.env.WS_PORT || 3101)} />
}

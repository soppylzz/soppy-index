import { handle } from "../../lib/handler.ts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export {
  handle as GET,
  handle as HEAD,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
  handle as OPTIONS,
}

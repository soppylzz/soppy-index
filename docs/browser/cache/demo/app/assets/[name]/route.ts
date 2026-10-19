import { resourceResponse } from "../../../lib/cache.ts"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Context = { params: Promise<{ name: string }> }

export async function GET(request: Request, { params }: Context) {
  return resourceResponse(request, (await params).name)
}

export async function HEAD(request: Request, { params }: Context) {
  return resourceResponse(request, (await params).name)
}

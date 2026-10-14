export type Pretty<T> = { [K in keyof T]: T[K] } & {}

// light: contravariance
export type UnionToIntersection<T> = (T extends any ? (k: T) => void : never) extends (
  k: infer R
) => void
  ? R
  : never

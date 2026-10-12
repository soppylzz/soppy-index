import { Pretty } from "../utils"

type RequiredByKeys<T, K extends keyof T = keyof T> = Pretty<Omit<T, K> & Required<Pick<T, K>>>

import type { Equal, Expect } from "@type-challenges/utils"

interface User {
  name?: string
  age?: number
  address?: string
}

interface UserRequiredName {
  name: string
  age?: number
  address?: string
}

interface UserRequiredNameAndAge {
  name: string
  age: number
  address?: string
}

type cases = [
  Expect<Equal<RequiredByKeys<User, "name">, UserRequiredName>>,
  Expect<Equal<RequiredByKeys<User, "name" | "age">, UserRequiredNameAndAge>>,
  Expect<Equal<RequiredByKeys<User>, Required<User>>>,
  // @ts-expect-error: Unknown keys must be rejected.
  Expect<Equal<RequiredByKeys<User, "name" | "unknown">, UserRequiredName>>,
]

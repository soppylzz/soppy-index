import type { UnionToIntersection } from "./utils"
import type { Equal, Expect } from "@type-challenges/utils"

type A = { a: 1 } | { b: 2 }
type B = { a: 1; b: 2 }

type Convariance = B extends A ? true : false
type Contravariance = ((a: A) => void) extends (a: B) => void ? true : false

type checks = [Expect<Equal<Convariance, true>>, Expect<Equal<Contravariance, true>>]

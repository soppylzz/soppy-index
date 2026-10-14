type LookUp<U, T> = U extends infer R extends { type: string }
  ? R["type"] extends T
    ? U
    : never
  : never

import type { Equal, Expect } from "@type-challenges/utils"

interface Cat {
  type: "cat"
  breeds: "Abyssinian" | "Shorthair" | "Curl" | "Bengal"
}

interface Dog {
  type: "dog"
  breeds: "Hound" | "Brittany" | "Bulldog" | "Boxer"
  color: "brown" | "white" | "black"
}

type Animal = Cat | Dog

type cases = [Expect<Equal<LookUp<Animal, "dog">, Dog>>, Expect<Equal<LookUp<Animal, "cat">, Cat>>]

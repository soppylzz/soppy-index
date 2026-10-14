type Falsy =
  | false
  | 0
  | ""
  | []
  // light: use never to prevent inheritance matching, like `{a: number} extends {}`
  | { [key: string]: never }
  | undefined
  | null
type AnyOf<T extends readonly unknown[]> = T[number] extends Falsy ? false : true

type TestError = { a: number } extends {} ? "match" : "unmatch"
type TestTruth = { a: number } extends { [k in string]: never } ? "match" : "unmatch"

import type { Equal, Expect } from "@type-challenges/utils"

type testCases = [Expect<Equal<TestError, "match">>, Expect<Equal<TestTruth, "unmatch">>]

type cases = [
  Expect<Equal<AnyOf<[1, "test", true, [1], { name: "test" }, { 1: "test" }]>, true>>,
  Expect<Equal<AnyOf<[1, "", false, [], {}]>, true>>,
  Expect<Equal<AnyOf<[0, "test", false, [], {}]>, true>>,
  Expect<Equal<AnyOf<[0, "", true, [], {}]>, true>>,
  Expect<Equal<AnyOf<[0, "", false, [1], {}]>, true>>,
  Expect<Equal<AnyOf<[0, "", false, [], { name: "test" }]>, true>>,
  Expect<Equal<AnyOf<[0, "", false, [], { 1: "test" }]>, true>>,
  Expect<Equal<AnyOf<[0, "", false, [], { name: "test" }, { 1: "test" }]>, true>>,
  Expect<Equal<AnyOf<[0, "", false, [], {}, undefined, null]>, false>>,
  Expect<Equal<AnyOf<[]>, false>>,
]

type LengthOfString<S extends string, Acc extends unknown[] = []> = S extends ""
  ? Acc["length"]
  : S extends `${infer F}${infer R}`
    ? LengthOfString<R, [...Acc, F]>
    : []

import type { Equal, Expect } from "@type-challenges/utils"

type Test = LengthOfString<"">

type cases = [
  Expect<Equal<LengthOfString<"">, 0>>,
  Expect<Equal<LengthOfString<"kumiko">, 6>>,
  Expect<Equal<LengthOfString<"reina">, 5>>,
  Expect<Equal<LengthOfString<"Sound! Euphonium">, 16>>,
]

type CheckRepeatedChars<
  T extends string,
  Checked extends string[] = [],
  CheckedType = Checked[number],
> = T extends `${infer F}${infer R}`
  ? F extends CheckedType
    ? true
    : CheckRepeatedChars<R, [...Checked, F]>
  : false

type Test = CheckRepeatedChars<"abb">

import type { Equal, Expect } from "@type-challenges/utils"

type cases = [
  Expect<Equal<CheckRepeatedChars<"abc">, false>>,
  Expect<Equal<CheckRepeatedChars<"abb">, true>>,
  Expect<Equal<CheckRepeatedChars<"cbc">, true>>,
  Expect<Equal<CheckRepeatedChars<"">, false>>,
]

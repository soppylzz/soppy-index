type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"

type PrevDigit = {
  "0": "9"
  "1": "0"
  "2": "1"
  "3": "2"
  "4": "3"
  "5": "4"
  "6": "5"
  "7": "6"
  "8": "7"
  "9": "8"
}

type Reverse<S extends string> = S extends `${infer First}${infer Rest}`
  ? `${Reverse<Rest>}${First}`
  : ""

type MinusOneReversed<S extends string> = S extends `${infer First extends Digit}${infer Rest}`
  ? First extends "0"
    ? `9${MinusOneReversed<Rest>}`
    : `${PrevDigit[First]}${Rest}`
  : ""

type RemoveLeadingZeros<S extends string> = S extends `0${infer Rest}`
  ? RemoveLeadingZeros<Rest>
  : S extends ""
    ? "0"
    : S

type ToNumber<S extends string> = S extends `${infer N extends number}` ? N : never

/**
 * tuple-based arithmetic works well for small integers but hits recursion limits with large numbers.
 * string-based arithmetic handles large integers efficiently by operating on decimal digits instead of tuple lengths.
 */
type MinusOne<T extends number> = ToNumber<
  RemoveLeadingZeros<Reverse<MinusOneReversed<Reverse<`${T}`>>>>
>

import type { Equal, Expect } from "@type-challenges/utils"

type cases = [
  Expect<Equal<MinusOne<1>, 0>>,
  Expect<Equal<MinusOne<55>, 54>>,
  Expect<Equal<MinusOne<3>, 2>>,
  Expect<Equal<MinusOne<100>, 99>>,
  Expect<Equal<MinusOne<1101>, 1100>>,
  Expect<Equal<MinusOne<9_007_199_254_740_992>, 9_007_199_254_740_991>>,
]

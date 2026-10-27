type ToReverseArray<N extends string, O extends string[] = []> = N extends `${infer F}${infer R}`
  ? ToReverseArray<R, [F, ...O]>
  : O

type Test1_1 = ToReverseArray<"1">

type CompareMap = {
  "0": "0"
  "1": "0" | "1"
  "2": "0" | "1" | "2"
  "3": "0" | "1" | "2" | "3"
  "4": "0" | "1" | "2" | "3" | "4"
  "5": "0" | "1" | "2" | "3" | "4" | "5"
  "6": "0" | "1" | "2" | "3" | "4" | "5" | "6"
  "7": "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7"
  "8": "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8"
  "9": "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
}

type NumberString = keyof CompareMap

type CompareNumber<N1 extends string, N2 extends string> = N1 extends NumberString
  ? N2 extends NumberString
    ? N1 extends CompareMap[N2]
      ? false
      : true
    : never
  : never

type Test2_1 = CompareNumber<"1", "1">
type Test2_2 = CompareNumber<"1", "2">
type Test2_3 = CompareNumber<"2", "1">

type CompareReverseArray<
  T extends string[],
  U extends string[],
  LastCompare extends boolean = false,
> = T extends [infer TF extends string, ...infer TR extends string[]]
  ? U extends [infer UF extends string, ...infer UR extends string[]]
    ? CompareReverseArray<TR, UR, UF extends TF ? LastCompare : CompareNumber<TF, UF>>
    : true
  : U["length"] extends 0
    ? LastCompare
    : false

type Test3_1 = ["1"] extends [infer F extends string, ...infer R extends string[]] ? R : never

type GreaterThan<T extends number, U extends number> = CompareReverseArray<
  ToReverseArray<`${T}`>,
  ToReverseArray<`${U}`>
>

type Test = GreaterThan<10, 5>

import type { Equal, Expect } from "@type-challenges/utils"

type cases = [
  Expect<Equal<GreaterThan<1, 0>, true>>,
  Expect<Equal<GreaterThan<5, 4>, true>>,
  Expect<Equal<GreaterThan<4, 5>, false>>,
  Expect<Equal<GreaterThan<0, 0>, false>>,
  Expect<Equal<GreaterThan<10, 9>, true>>,
  Expect<Equal<GreaterThan<20, 20>, false>>,
  Expect<Equal<GreaterThan<10, 100>, false>>,
  Expect<Equal<GreaterThan<111, 11>, true>>,
  Expect<Equal<GreaterThan<1234567891011, 1234567891010>, true>>,
]

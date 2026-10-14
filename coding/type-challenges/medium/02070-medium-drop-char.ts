type DropChar<S, C extends string> = S extends `${infer F}${infer R}`
  ? F extends C
    ? DropChar<R, C>
    : `${F}${DropChar<R, C>}`
  : ""

import type { Equal, Expect } from "@type-challenges/utils"

type cases = [
  // @ts-expect-error: Empty removal target is an intentionally failing case.
  Expect<Equal<DropChar<"butter fly!", "">, "butterfly!">>,
  Expect<Equal<DropChar<"butter fly!", " ">, "butterfly!">>,
  Expect<Equal<DropChar<"butter fly!", "!">, "butter fly">>,
  Expect<Equal<DropChar<"    butter fly!        ", " ">, "butterfly!">>,
  Expect<Equal<DropChar<" b u t t e r f l y ! ", " ">, "butterfly!">>,
  Expect<Equal<DropChar<" b u t t e r f l y ! ", "b">, "  u t t e r f l y ! ">>,
  Expect<Equal<DropChar<" b u t t e r f l y ! ", "t">, " b u   e r f l y ! ">>,
]

type Replace<S extends string, From extends string, To extends string> = From extends ""
  ? S
  : S extends `${From}${infer R}`
    ? `${To}${R}`
    : S extends `${infer F}${infer R2}`
      ? `${F}${Replace<R2, From, To>}`
      : S

import type { Equal, Expect } from "@type-challenges/utils"

type cases = [
  Expect<Equal<Replace<"foobar", "bar", "foo">, "foofoo">>,
  Expect<Equal<Replace<"foobarbar", "bar", "foo">, "foofoobar">>,
  Expect<Equal<Replace<"foobarbar", "", "foo">, "foobarbar">>,
  Expect<Equal<Replace<"foobarbar", "bar", "">, "foobar">>,
  Expect<Equal<Replace<"foobarbar", "bra", "foo">, "foobarbar">>,
  Expect<Equal<Replace<"", "", "">, "">>,
]

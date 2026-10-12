// like `any`, `never` can satisfy the `extends string` constraint,
// so `MUnit<never>` is valid and must be handled explicitly.
type EUnit<E extends string> = [E] extends [never] ? "" : `__${E}`
type MUnit<M extends string> = [M] extends [never] ? "" : `--${M}`

type BEM<
  B extends string,
  E extends string[],
  M extends string[],
> = `${B}${EUnit<E[number]>}${MUnit<M[number]>}`

import type { Equal, Expect } from "@type-challenges/utils"

type TestPre = [][number] // never
type Test = BEM<"btn", ["price"], []>

type cases = [
  Expect<Equal<BEM<"btn", ["price"], []>, "btn__price">>,
  Expect<
    Equal<
      BEM<"btn", ["price"], ["warning", "success"]>,
      "btn__price--warning" | "btn__price--success"
    >
  >,
  Expect<
    Equal<BEM<"btn", [], ["small", "medium", "large"]>, "btn--small" | "btn--medium" | "btn--large">
  >,
]

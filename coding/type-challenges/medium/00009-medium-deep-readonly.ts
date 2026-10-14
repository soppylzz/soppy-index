type ReadonlyArray<T extends any[]> = T extends [infer F, ...infer R]
  ? R extends any[]
    ? readonly [DeepReadonly<F>, ...ReadonlyArray<R>]
    : readonly [DeepReadonly<F>]
  : T

type ReadonlyObject<T extends Record<PropertyKey, any>> = {
  readonly [k in keyof T]: DeepReadonly<T[k]>
}

type DeepReadonly<T> = T extends string | number | symbol | ((...args: any[]) => any)
  ? T
  : T extends Record<PropertyKey, any>
    ? ReadonlyObject<T>
    : T extends any[]
      ? ReadonlyArray<T>
      : T

import type { Equal, Expect } from "@type-challenges/utils"

type cases = [
  Expect<Equal<DeepReadonly<X1>, Expected1>>,
  Expect<Equal<DeepReadonly<X2>, Expected2>>,
]

type Test = DeepReadonly<() => void>

type X1 = {
  a: () => 22
  b: string
  c: {
    d: boolean
    e: {
      g: {
        h: {
          i: true
          j: "string"
        }
        k: "hello"
      }
      l: [
        "hi",
        {
          m: ["hey"]
        },
      ]
    }
  }
}

type X2 = { a: string } | { b: number }

type Expected1 = {
  readonly a: () => 22
  readonly b: string
  readonly c: {
    readonly d: boolean
    readonly e: {
      readonly g: {
        readonly h: {
          readonly i: true
          readonly j: "string"
        }
        readonly k: "hello"
      }
      readonly l: readonly [
        "hi",
        {
          readonly m: readonly ["hey"]
        },
      ]
    }
  }
}

type Expected2 = { readonly a: string } | { readonly b: number }

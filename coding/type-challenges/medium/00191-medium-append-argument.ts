type ParametersOf<Fn extends (...args: any[]) => any> = Fn extends (...args: infer P) => any
  ? P
  : []

type AppendArgument<Fn extends (...args: any[]) => any, A> = (
  ...args: [...ParametersOf<Fn>, x: A]
) => ReturnType<Fn>

import type { Equal, Expect } from "@type-challenges/utils"

type Case1 = AppendArgument<(a: number, b: string) => number, boolean>
type Result1 = (a: number, b: string, x: boolean) => number

type Case2 = AppendArgument<() => void, undefined>
type Result2 = (x: undefined) => void

type cases = [
  Expect<Equal<Case1, Result1>>,
  Expect<Equal<Case2, Result2>>,
  // @ts-expect-error
  AppendArgument<unknown, undefined>,
]

export type Next = () => Promise<void>
export type Middleware<Context> = (context: Context, next: Next) => void | Promise<void>

export function composeMiddleware<Context>(middlewares: readonly Middleware<Context>[]) {
  const chain = [...middlewares]
  return (context: Context): Promise<void> => {
    let lastIndex = -1
    const dispatch = async (index: number): Promise<void> => {
      if (index <= lastIndex) throw new Error("next() called multiple times")
      lastIndex = index
      const middleware = chain[index]
      if (middleware) await middleware(context, () => dispatch(index + 1))
    }
    return dispatch(0)
  }
}

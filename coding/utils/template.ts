export function template(source: string, data: object, fallback = ""): string {
  return source.replace(/\{\{\s*([\w$]+(?:\.[\w$]+)*)\s*\}\}/g, (_, path: string) => {
    let current: unknown = data
    for (const key of path.split(".")) {
      if (current === null || typeof current !== "object" || !Object.hasOwn(current, key)) {
        return fallback
      }
      current = (current as Record<string, unknown>)[key]
    }
    return current == null ? fallback : String(current)
  })
}

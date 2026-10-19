export function parseQuery(query: string): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = Object.create(null)
  const source = query.replace(/^\?/, "").split("#", 1)[0]
  const decode = (value: string) => decodeURIComponent(value.replace(/\+/g, " "))

  for (const pair of source.split("&")) {
    if (!pair) continue
    const separator = pair.indexOf("=")
    const key = decode(separator < 0 ? pair : pair.slice(0, separator))
    const value = decode(separator < 0 ? "" : pair.slice(separator + 1))
    if (!Object.hasOwn(result, key)) result[key] = value
    else {
      const previous = result[key]
      if (Array.isArray(previous)) previous.push(value)
      else result[key] = [previous, value]
    }
  }
  return result
}

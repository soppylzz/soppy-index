function isValid(s: string): boolean {
  const stack = []
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (["{", "(", "["].includes(c)) {
      stack.push(c)
    } else {
      const top = stack.pop()
      if (top === "[" && c === "]") continue
      if (top === "{" && c === "}") continue
      if (top === "(" && c === ")") continue
      return false
    }
  }

  return stack.length === 0
}

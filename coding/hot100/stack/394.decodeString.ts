function decodeString(s: string): string {
  const stack = []

  for (let i = 0; i < s.length; i++) {
    const c = s[i]

    if (c !== "]") stack.push(c)
    else {
      let word = ""
      while (stack.length > 0 && stack[stack.length - 1] !== "[") {
        word = stack.pop() + word
      }

      stack.pop() // pop "["

      let numStr = ""
      while (
        stack.length > 0 &&
        stack[stack.length - 1].charCodeAt(0) >= "0".charCodeAt(0) &&
        stack[stack.length - 1].charCodeAt(0) <= "9".charCodeAt(0)
      ) {
        numStr = stack.pop() + numStr // pop num
      }

      const num = Number(numStr)

      let resolved = ""
      for (let i = 0; i < num; i++) {
        resolved += word
      }

      stack.push(resolved)
    }
  }

  let result = ""
  while (stack.length > 0) {
    result = stack.pop() + result
  }

  return result
}

decodeString("3[a]2[bc]")

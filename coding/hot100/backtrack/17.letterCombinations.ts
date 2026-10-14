const diags: Record<string, string[]> = {
  "2": ["a", "b", "c"],
  "3": ["d", "e", "f"],
  "4": ["g", "h", "i"],
  "5": ["j", "k", "l"],
  "6": ["m", "n", "o"],
  "7": ["p", "q", "r", "s"],
  "8": ["t", "u", "v"],
  "9": ["w", "x", "y", "z"],
}

function letterCombinations(digits: string): string[] {
  const n = digits.length,
    result: string[] = [],
    digitsArr: string[] = digits.split("")

  let depth = 0

  const temp: string[] = []

  function generate() {
    if (depth === n) {
      result.push(temp.join(""))
    } else {
      depth++
      const chars = diags[digitsArr[depth - 1]]
      for (const ch of chars) {
        temp.push(ch)
        generate()
        temp.pop()
      }
      depth--
    }
  }

  generate()

  return result
}

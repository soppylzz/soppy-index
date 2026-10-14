function generateParenthesis(n: number): string[] {
  /**
   * consider inserting "()" as ()?, ?() or (?) - [X]
   * tip: handle "(" and ")" separately
   */
  const result: string[] = []
  const temp: string[] = []

  function generate(left: number, right: number) {
    if (left === n && right === n) {
      result.push(temp.join(""))
    } else {
      if (left < n) {
        temp.push("(")
        generate(left + 1, right)
        temp.pop()
      }

      // fix: avoid adding an illegal ")"
      if (right < left) {
        temp.push(")")
        generate(left, right + 1)
        temp.pop()
      }
    }
  }
  generate(0, 0)
  return result
}

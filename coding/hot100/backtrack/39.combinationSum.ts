function combinationSum(candidates: number[], target: number): number[][] {
  const result: number[][] = []

  const temp: number[] = []
  let flag = 0

  function generate(target: number) {
    if (target === 0) {
      result.push([...temp])
    } else if (target > 0) {
      const old = flag
      for (let i = flag; i < candidates.length; i++) {
        const num = candidates[i]
        temp.push(num)
        flag = i
        generate(target - num)
        temp.pop()
      }
      flag = old
    }
  }

  generate(target)

  return result
}

function partitionLabels(s: string): number[] {
  const aCode = "a".charCodeAt(0),
    farest: number[] = Array(26).fill(-1)

  for (let i = s.length - 1; i >= 0; i--) {
    if (farest[s[i].charCodeAt(0) - aCode] === -1) {
      farest[s[i].charCodeAt(0) - aCode] = i
    }
  }

  const result: number[] = []
  let i = 0

  while (i < s.length) {
    let j = i
    let curFar = i

    while (j <= curFar) {
      curFar = Math.max(curFar, farest[s[j].charCodeAt(0) - aCode])
      j++
    }
    result.push(curFar - i + 1)
    i = j
  }

  return result
}

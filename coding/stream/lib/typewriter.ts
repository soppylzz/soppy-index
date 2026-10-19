const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })

// Segment the accumulated text so a delta boundary does not define a character.
export function revealNext(target: string, displayed: string, count: number): string {
  const graphemes = Array.from(segmenter.segment(target), (part) => part.segment)
  const visible = Array.from(segmenter.segment(displayed)).length
  return graphemes.slice(0, visible + count).join("")
}

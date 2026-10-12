interface Sample {
  value: number
}
const sample: Sample = { value: 42 }
console.log(JSON.stringify({ value: sample.value, runtimeType: typeof sample.value }))
export {}

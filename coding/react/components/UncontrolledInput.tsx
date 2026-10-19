import { useRef, useState } from "react"

export function UncontrolledInput() {
  const input = useRef<HTMLInputElement>(null)
  const [submitted, setSubmitted] = useState("")
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitted(input.current!.value)
      }}
    >
      <label>
        Uncontrolled note <input ref={input} defaultValue="Read from the DOM on submit" />
      </label>
      <button type="submit">Read DOM value</button>
      <output>{submitted}</output>
    </form>
  )
}

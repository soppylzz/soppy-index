import { act, useEffect, useState, type ReactNode } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Accordion } from "../components/Accordion.tsx"
import { AutoComplete } from "../components/AutoComplete.tsx"
import { DynamicForm, validateProfile } from "../components/DynamicForm.tsx"
import { UncontrolledInput } from "../components/UncontrolledInput.tsx"
import { LazyImage } from "../components/LazyImage.tsx"
import { withLoading } from "../hoc/withLoading.tsx"
import { ExtendedDemos } from "../demos/ExtendedDemos.tsx"

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const roots: Root[] = []
function mount(node: ReactNode) {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  roots.push(root)
  const render = (next: ReactNode) => act(() => root.render(next))
  render(node)
  return { container, render }
}
function click(container: HTMLElement, label: string) {
  const button = [...container.querySelectorAll("button")].find(
    (item) => item.textContent === label
  )
  if (!button) throw new Error(`Button not found: ${label}`)
  act(() => button.click())
}
function type(input: HTMLInputElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value)
    input.dispatchEvent(new Event("input", { bubbles: true }))
  })
}

afterEach(() => {
  act(() => {
    for (const root of roots.splice(0)) root.unmount()
  })
  document.body.replaceChildren()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("extended components", () => {
  it("runs the integrated Hooks model and cleans demo timers", async () => {
    vi.useFakeTimers()
    vi.stubGlobal("IntersectionObserver", undefined)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ["React", "Vue"] })
    )
    const view = mount(<ExtendedDemos />)
    await act(async () => {})
    click(view.container, "Model setState")
    await act(async () => {})
    expect(view.container.textContent).toContain("State: 1; memo: 2")
    click(view.container, "Model dispatch +2")
    await act(async () => {})
    expect(view.container.textContent).toContain("reducer: 2")
    click(view.container, "Burst click")
    view.render(null)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("expands one accordion panel at a time and allows closing it", () => {
    const view = mount(
      <Accordion
        items={[
          { id: "a", title: "A", content: "Alpha" },
          { id: "b", title: "B", content: "Beta" },
        ]}
      />
    )
    click(view.container, "A")
    expect(view.container.querySelector('[role="region"]')?.hasAttribute("hidden")).toBe(false)
    click(view.container, "B")
    expect(view.container.querySelectorAll('[aria-expanded="true"]')).toHaveLength(1)
    click(view.container, "B")
    expect(view.container.querySelectorAll('[aria-expanded="true"]')).toHaveLength(0)
  })

  it("filters autocomplete and selects by keyboard and pointer", () => {
    function Demo() {
      const [value, setValue] = useState("")
      return <AutoComplete options={["React", "Vue", "Solid"]} value={value} onChange={setValue} />
    }
    const view = mount(<Demo />)
    const input = view.container.querySelector("input")!
    act(() => input.focus())
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true })))
    expect(view.container.querySelector('[aria-selected="true"]')?.textContent).toBe("Solid")
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })))
    expect(input.value).toBe("Solid")
    expect(input.getAttribute("aria-expanded")).toBe("false")
    type(input, "re")
    expect(view.container.querySelectorAll('[role="option"]')).toHaveLength(1)
    act(() => (view.container.querySelector('[role="option"]') as HTMLElement).click())
    expect(input.value).toBe("React")
    type(input, "unmatched")
    expect(view.container.querySelector('[role="status"]')?.textContent).toContain("No matching")
    act(() => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })))
    expect(input.getAttribute("aria-expanded")).toBe("false")
  })

  it("validates dynamic fields by stable identity and submits normalized data", () => {
    const submit = vi.fn()
    const view = mount(<DynamicForm onSubmit={submit} />)
    click(view.container, "Save profile")
    expect(submit).not.toHaveBeenCalled()
    expect(view.container.querySelectorAll('[aria-invalid="true"]')).toHaveLength(2)
    const inputs = view.container.querySelectorAll("input")
    type(inputs[0], " Ada ")
    type(inputs[1], " ada@example.com ")
    click(view.container, "Add skill")
    click(view.container, "Add skill")
    const skills = view.container.querySelectorAll("fieldset input")
    type(skills[0] as HTMLInputElement, "React")
    type(skills[1] as HTMLInputElement, " Vue ")
    const stableId = skills[1].id
    click(view.container, "Remove skill 1")
    expect(view.container.querySelector("fieldset input")?.id).toBe(stableId)
    click(view.container, "Save profile")
    expect(submit).toHaveBeenCalledWith({
      name: "Ada",
      email: "ada@example.com",
      skills: [{ id: "skill-2", value: "Vue" }],
    })
    const errors = validateProfile({
      name: "Ada",
      email: "ada@example.com",
      skills: [
        { id: "a", value: "React" },
        { id: "b", value: " react " },
      ],
    })
    expect(errors.b).toBe("Skills must be unique.")
  })

  it("reads uncontrolled values from the DOM on submit", () => {
    const view = mount(<UncontrolledInput />)
    const input = view.container.querySelector("input")!
    input.value = "DOM owns this value"
    expect(view.container.querySelector("output")?.textContent).toBe("")
    click(view.container, "Read DOM value")
    expect(view.container.querySelector("output")?.textContent).toBe("DOM owns this value")
  })

  it("unmounts the wrapped HOC component while loading", () => {
    const cleanup = vi.fn()
    function Message({ text }: { text: string }) {
      useEffect(() => cleanup, [])
      return <p>{text}</p>
    }
    const LoadingMessage = withLoading(Message)
    const view = mount(<LoadingMessage loading={false} componentProps={{ text: "Ready" }} />)
    expect(view.container.textContent).toBe("Ready")
    view.render(<LoadingMessage loading componentProps={{ text: "Ready" }} />)
    expect(cleanup).toHaveBeenCalledOnce()
    expect(view.container.querySelector('[role="status"]')).not.toBeNull()
  })

  it("uses an eager fallback for lazy images without observer support", () => {
    vi.stubGlobal("IntersectionObserver", undefined)
    const view = mount(<LazyImage src="/image.svg" alt="Example" width={100} height={80} />)
    expect(view.container.querySelector("img")?.getAttribute("src")).toBe("/image.svg")
    act(() => view.container.querySelector("img")!.dispatchEvent(new Event("error")))
    expect(view.container.querySelector('[role="alert"]')?.textContent).toContain(
      "could not be loaded"
    )
  })
})

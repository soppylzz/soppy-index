import { useId, useRef, useState } from "react"

export interface Profile {
  name: string
  email: string
  skills: { id: string; value: string }[]
}
export function validateProfile(profile: Profile): Record<string, string> {
  const errors: Record<string, string> = {}
  if (profile.name.trim().length < 2) errors.name = "Enter at least two characters."
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim()))
    errors.email = "Enter a valid email address."
  const seen = new Set<string>()
  for (const skill of profile.skills) {
    const value = skill.value.trim().toLowerCase()
    if (!value) errors[skill.id] = "Enter a skill or remove this field."
    else if (seen.has(value)) errors[skill.id] = "Skills must be unique."
    seen.add(value)
  }
  return errors
}

export function DynamicForm({ onSubmit }: { onSubmit: (value: Profile) => void }) {
  const prefix = useId()
  const sequence = useRef(1)
  const [value, setValue] = useState<Profile>({ name: "", email: "", skills: [] })
  const [submitted, setSubmitted] = useState(false)
  const errors = submitted ? validateProfile(value) : {}
  function field(key: "name" | "email", label: string) {
    const id = `${prefix}-${key}`
    return (
      <div>
        <label htmlFor={id}>{label}</label>
        <input
          id={id}
          type={key === "email" ? "email" : "text"}
          value={value[key]}
          aria-invalid={Boolean(errors[key])}
          aria-describedby={errors[key] ? `${id}-error` : undefined}
          onChange={(event) => setValue((previous) => ({ ...previous, [key]: event.target.value }))}
        />
        {errors[key] && (
          <p className="error" id={`${id}-error`}>
            {errors[key]}
          </p>
        )}
      </div>
    )
  }
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitted(true)
        if (Object.keys(validateProfile(value)).length) return
        onSubmit({
          name: value.name.trim(),
          email: value.email.trim(),
          skills: value.skills.map((skill) => ({ ...skill, value: skill.value.trim() })),
        })
      }}
    >
      {field("name", "Display name")}
      {field("email", "Email")}
      <fieldset>
        <legend>Dynamic skills</legend>
        {value.skills.map((skill, index) => (
          <div key={skill.id}>
            <label htmlFor={`${prefix}-${skill.id}`}>Skill {index + 1}</label>
            <input
              id={`${prefix}-${skill.id}`}
              value={skill.value}
              aria-invalid={Boolean(errors[skill.id])}
              aria-describedby={errors[skill.id] ? `${prefix}-${skill.id}-error` : undefined}
              onChange={(event) =>
                setValue((previous) => ({
                  ...previous,
                  skills: previous.skills.map((item) =>
                    item.id === skill.id ? { ...item, value: event.target.value } : item
                  ),
                }))
              }
            />
            <button
              type="button"
              onClick={() =>
                setValue((previous) => ({
                  ...previous,
                  skills: previous.skills.filter((item) => item.id !== skill.id),
                }))
              }
            >
              Remove skill {index + 1}
            </button>
            {errors[skill.id] && (
              <p className="error" id={`${prefix}-${skill.id}-error`}>
                {errors[skill.id]}
              </p>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            const skill = { id: `skill-${sequence.current++}`, value: "" }
            setValue((previous) => ({ ...previous, skills: [...previous.skills, skill] }))
          }}
        >
          Add skill
        </button>
      </fieldset>
      <button type="submit">Save profile</button>
    </form>
  )
}

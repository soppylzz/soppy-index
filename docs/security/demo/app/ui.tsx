"use client"

import { Label, ListBox, Select } from "@heroui/react"

export { Button, Card, CardContent, Form, Input, Label, Link, TextField } from "@heroui/react"

export function IdentitySelect({ emails }: { emails: string[] }) {
  return (
    <Select name="email" defaultValue={emails[0]} isRequired>
      <Label>Identity</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {emails.map((email) => (
            <ListBox.Item key={email} id={email} textValue={email}>
              {email}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  )
}

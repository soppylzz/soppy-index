export type ModelRules<Model extends object> = {
  [Key in keyof Model]?: (value: unknown) => boolean
}

export function createValidatedModel<Model extends object>(
  target: Model,
  rules: ModelRules<Model>
): Model {
  return new Proxy(target, {
    set(object, property, value: unknown, receiver) {
      const rule = Object.hasOwn(rules, property) ? rules[property as keyof Model] : undefined
      if (rule && !rule(value)) throw new TypeError(`Invalid value for ${String(property)}`)
      // Preserve setters and failure semantics instead of assigning recursively through the proxy.
      return Reflect.set(object, property, value, receiver)
    },
  })
}

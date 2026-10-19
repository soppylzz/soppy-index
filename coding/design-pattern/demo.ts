import { createSingleton } from "./singleton.ts"
import { createNotification } from "./factory.ts"
import { FieldValidator, required, minLength } from "./strategy.ts"
import { ObservableValue } from "./observer.ts"
import { EventEmitter } from "./event-emitter.ts"
import { createValidatedModel } from "./proxy.ts"
import { withRequestLog } from "./decorator.ts"
import { adaptLegacyUser } from "./adapter.ts"
import { CommandHistory, EditorDocument, createReplaceTextCommand } from "./command.ts"
import { UploadController } from "./state.ts"
import { composeMiddleware } from "./chain-of-responsibility.ts"
import { createFormFacade } from "./facade.ts"
import { MenuGroup, MenuItem } from "./composite.ts"

const demos: Record<string, () => unknown | Promise<unknown>> = {
  singleton() {
    const getService = createSingleton((name: string) => ({ name }))
    const first = getService("first")
    return { sameInstance: first === getService("second"), name: first.name }
  },
  factory() {
    return createNotification("success", "Saved")
  },
  strategy() {
    const validator = new FieldValidator(required)
    const empty = validator.validate("")
    validator.setStrategy(minLength(3))
    return { empty, short: validator.validate("A"), valid: validator.validate("Ada") === undefined }
  },
  observer() {
    const value = new ObservableValue(0)
    const changes: string[] = []
    value.subscribe((next) => {
      changes.push(`A:${next}`)
      if (next === 1) value.set(2)
    })
    value.subscribe((next) => changes.push(`B:${next}`))
    value.set(1)
    return changes
  },
  "event-emitter"() {
    const events = new EventEmitter<{ saved: [number] }>()
    const calls: string[] = []
    events.on("saved", (id) => calls.push(`persistent:${id}`))
    events.once("saved", (id) => calls.push(`once:${id}`))
    events.emit("saved", 1)
    events.emit("saved", 2)
    return calls
  },
  proxy() {
    const model = createValidatedModel(
      { age: 20 },
      { age: (value) => typeof value === "number" && value >= 0 }
    )
    model.age = 21
    let rejected = false
    try {
      model.age = -1
    } catch {
      rejected = true
    }
    return { age: model.age, rejected }
  },
  async decorator() {
    const phases: string[] = []
    const request = withRequestLog(
      (value: number) => value * 2,
      (entry) => phases.push(entry.phase)
    )
    return { value: await request(5), phases }
  },
  adapter() {
    return adaptLegacyUser({ user_id: 7, full_name: "Ada", enabled: 1 })
  },
  command() {
    const document = new EditorDocument("A")
    const history = new CommandHistory()
    history.execute(createReplaceTextCommand(document, "AB"))
    const values = [document.getText()]
    history.undo()
    values.push(document.getText())
    history.redo()
    values.push(document.getText())
    return values
  },
  state() {
    const upload = new UploadController()
    return [
      upload.getStatus(),
      upload.dispatch("start"),
      upload.dispatch("pause"),
      upload.dispatch("resume"),
      upload.dispatch("succeed"),
    ]
  },
  async "chain-of-responsibility"() {
    const run = composeMiddleware<string[]>([
      async (events, next) => {
        events.push("A before")
        await next()
        events.push("A after")
      },
      async (events, next) => {
        events.push("B before")
        await next()
        events.push("B after")
      },
      (events) => {
        events.push("handler")
      },
    ])
    const events: string[] = []
    await run(events)
    return events
  },
  async facade() {
    const form = createFormFacade({
      validate: (name: string) => (name.trim() ? [] : ["Required"]),
      submit: (name: string) => `Saved:${name}`,
    })
    return form.submit("Ada")
  },
  composite() {
    const menu = new MenuGroup("Root", [
      new MenuItem("Home", "/"),
      new MenuGroup("Admin", [new MenuItem("Users", "/users", "users:read")]),
    ])
    return menu.toView(new Set())
  },
}

const selected = process.argv[2]
if (selected && !Object.hasOwn(demos, selected)) {
  console.error(`Unknown demo: ${selected}. Available: ${Object.keys(demos).join(", ")}`)
  process.exitCode = 1
} else {
  for (const name of selected ? [selected] : Object.keys(demos)) {
    console.log(`[${name}] ${JSON.stringify(await demos[name]())}`)
  }
}

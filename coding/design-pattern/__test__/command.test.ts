import { describe, expect, it } from "vitest"
import { CommandHistory, EditorDocument, createReplaceTextCommand } from "../command.ts"

describe("editor commands", () => {
  it("executes, undoes and redoes edits in order", () => {
    const document = new EditorDocument("")
    const history = new CommandHistory()
    expect(history.undo()).toBe(false)
    history.execute(createReplaceTextCommand(document, "A"))
    history.execute(createReplaceTextCommand(document, "AB"))
    expect(document.getText()).toBe("AB")
    history.undo()
    expect(document.getText()).toBe("A")
    history.undo()
    expect(document.getText()).toBe("")
    history.redo()
    expect(document.getText()).toBe("A")
    history.redo()
    expect(document.getText()).toBe("AB")
    expect(history.redo()).toBe(false)
  })
  it("discards the redo branch when a new edit succeeds", () => {
    const document = new EditorDocument("A")
    const history = new CommandHistory()
    history.execute(createReplaceTextCommand(document, "B"))
    history.undo()
    history.execute(createReplaceTextCommand(document, "C"))
    expect(history.canRedo).toBe(false)
    expect(document.getText()).toBe("C")
  })
  it("does not consume history entries when a command fails", () => {
    const history = new CommandHistory()
    let shouldFail = true
    const command = {
      execute() {},
      undo() {
        if (shouldFail) throw new Error("failure")
      },
    }
    history.execute(command)
    expect(() => history.undo()).toThrow("failure")
    expect(history.canUndo).toBe(true)
    shouldFail = false
    expect(history.undo()).toBe(true)
    expect(() =>
      history.execute({
        execute() {
          throw new Error("failure")
        },
        undo() {},
      })
    ).toThrow("failure")
    expect(history.canRedo).toBe(true)
  })
  it("rejects undo before execution and duplicate execution without an undo", () => {
    const command = createReplaceTextCommand(new EditorDocument(), "A")
    expect(() => command.undo()).toThrow("not been executed")
    command.execute()
    expect(() => command.execute()).toThrow("already executed")
  })
  it("keeps failed redo operations available for another attempt", () => {
    const history = new CommandHistory()
    let executions = 0
    const command = {
      execute() {
        if (++executions === 2) throw new Error("redo failed")
      },
      undo() {},
    }
    history.execute(command)
    history.undo()
    expect(() => history.redo()).toThrow("redo failed")
    expect(history.canRedo).toBe(true)
    expect(history.canUndo).toBe(false)
    expect(history.redo()).toBe(true)
  })
})

export interface Command {
  execute(): void
  undo(): void
}

export class EditorDocument {
  private text: string
  constructor(text = "") {
    this.text = text
  }
  getText(): string {
    return this.text
  }
  setText(text: string): void {
    this.text = text
  }
}

export class CommandHistory {
  private executed: Command[] = []
  private undone: Command[] = []

  get canUndo(): boolean {
    return this.executed.length > 0
  }
  get canRedo(): boolean {
    return this.undone.length > 0
  }

  execute(command: Command): void {
    command.execute()
    // History changes only after the command reports success.
    this.executed.push(command)
    this.undone = []
  }

  undo(): boolean {
    const command = this.executed.at(-1)
    if (!command) return false
    command.undo()
    this.executed.pop()
    this.undone.push(command)
    return true
  }

  redo(): boolean {
    const command = this.undone.at(-1)
    if (!command) return false
    command.execute()
    this.undone.pop()
    this.executed.push(command)
    return true
  }
}

export function createReplaceTextCommand(document: EditorDocument, nextText: string): Command {
  let phase: "ready" | "executed" | "undone" = "ready"
  let previousText = ""
  return {
    execute() {
      if (phase === "executed") throw new Error("Command is already executed")
      previousText = document.getText()
      document.setText(nextText)
      phase = "executed"
    },
    undo() {
      if (phase !== "executed") throw new Error("Command has not been executed")
      document.setText(previousText)
      phase = "undone"
    },
  }
}

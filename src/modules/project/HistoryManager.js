export class HistoryManager {
  constructor(maxSize = 20) {
    this.maxSize = maxSize;
    this.undoStack = [];
    this.redoStack = [];
  }

  pushState(stateString) {
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === stateString) {
      return; // Evita estados duplicados consecutivos
    }
    this.undoStack.push(stateString);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  undo(currentState) {
    if (!this.canUndo()) return null;
    
    if (currentState) {
      this.redoStack.push(currentState);
    }
    
    return this.undoStack.pop();
  }

  redo(currentState) {
    if (!this.canRedo()) return null;
    
    if (currentState) {
      this.undoStack.push(currentState);
    }
    
    return this.redoStack.pop();
  }
}

const stack = []; let idx = -1;
export function execute(/*cmd*/){ /* TODO push & do */ }
export function undo(){ /* TODO */ }
export function redo(){ /* TODO */ }
export function canUndo(){ return idx >= 0; }
export function canRedo(){ return idx < stack.length-1; }

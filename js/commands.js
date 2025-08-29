const stack = []; let idx = -1;
let index = -1;           // index が実行済み最後
const LIMIT = 100;

export function execute(cmd){
  // 未来側を捨てる（分岐防止）
  if (index < stack.length - 1) stack.splice(index + 1);
  // 実行
  const undoPayload = cmd.do?.();
  stack.push({ cmd, undoPayload });
  // 上限
  if (stack.length > LIMIT) stack.shift();
  index = stack.length - 1;
}

export function undo(){
  if (index < 0) return;
  const { cmd, undoPayload } = stack[index];
  cmd.undo?.(undoPayload);
  index--;
}

export function redo(){
  if (index >= stack.length - 1) return;
  index++;
  const { cmd } = stack[index];
  const redoPayload = cmd.do?.();
  // redo の undoPayload を更新
  stack[index].undoPayload = redoPayload;
}
export function canUndo(){ return idx >= 0; }
export function canRedo(){ return idx < stack.length-1; }
export function clear(){ stack.length = 0; index = -1; }

// ===== 代表コマンド群 =====
import {
  addCharacter, updateCharacter, removeCharacterById,
  getCharacter, listRelationsByNode,
  addRelation, updateRelation, removeRelationById,
  listSheets, setNodePos
} from './state/index.js';
import {
  addNodeVisual, updateNodeVisual, removeVisualById,
  addEdgeVisual, updateEdgeVisual
} from './graph.js';

// ユーティリティ：ディープコピー
const clone = (x) => JSON.parse(JSON.stringify(x));

export function CmdAddCharacter(payload){
  return {
    do(){
      const id = addCharacter(payload);
      // 初期位置は呼び出し側で渡していてもOK。見た目反映:
      addNodeVisual({ id, name: payload.name || id, nodeColor: payload.nodeColor, textColor: payload.textColor, image: payload.image, pos: payload.pos });
      return { id };
    },
    undo({ id }){
      // 関連エッジは state の removeCharacterById で消える
      removeCharacterById(id);
      removeVisualById(id);
    }
  };
}

export function CmdUpdateCharacter(id, patch){
  return {
    do(){
      const prev = clone(getCharacter(id));
      updateCharacter(id, patch);
      updateNodeVisual(id, patch);
      return { prev };
    },
    undo({ prev }){
      if (!prev) return;
      updateCharacter(prev.id, prev);
      updateNodeVisual(prev.id, prev);
    }
  };
}

export function CmdRemoveCharacter(id){
  return {
    do(){
      // 復元用に人物＋紐づく関係＋各シートの座標を保存
      const char = clone(getCharacter(id));
      const rels = clone(listRelationsByNode(id));
      const sheets = clone(listSheets()); // positions を取り出す
      const positions = {};
      sheets.forEach(s => { if (s.positions?.[id]) positions[s.id] = s.positions[id]; });

      removeCharacterById(id);
      removeVisualById(id);
      return { char, rels, positions };
    },
    undo({ char, rels, positions }){
      if (!char) return;
      // 人物復元
      addCharacter(char);
      addNodeVisual({ id: char.id, name: char.name, nodeColor: char.nodeColor, textColor: char.textColor, image: char.image });
      // 座標復元
      Object.entries(positions||{}).forEach(([sheetId, pos]) => setNodePos(sheetId, char.id, pos));
      // 関係復元
      (rels||[]).forEach(r => {
        addRelation(r);
        addEdgeVisual(r);
      });
    }
  };
}

export function CmdAddRelation(payload){
  return {
    do(){
      const id = addRelation(payload);
      addEdgeVisual({ id, ...payload });
      return { id };
    },
    undo({ id }){
      removeRelationById(id);
      removeVisualById(id);
    }
  };
}

export function CmdUpdateRelation(id, patch){
  return {
    do(){
      const prev = clone(/* 既存取得 */ (/* 簡易 */) (()=> {
        // state.index.js に getRelation がある場合それを使う
        // なければリストから拾う
        // ここでは安全に実装
        try {
          const { listRelations } = require('./state/index.js'); // ESMでは不可。下の簡易取得に差し替え
        } catch(e){}
        // ESM前提：手動で取得
        const { listRelations } = requireCache(); // ダミー
      })());
      // ↑ 取り回しがややこしい場合は state/index.js に getRelation を用意して使ってください
      // ここでは getRelation がある前提にして書き直します：
    }
  };
}

// 完成版（getRelation を使う）
import { getRelation } from './state/index.js';

export function CmdUpdateRelation(id, patch){
  return {
    do(){
      const prev = clone(getRelation(id));
      updateRelation(id, patch);
      updateEdgeVisual(id, patch);
      return { prev };
    },
    undo({ prev }){
      if (!prev) return;
      updateRelation(prev.id, prev);
      updateEdgeVisual(prev.id, prev);
    }
  };
}

export function CmdRemoveRelation(id){
  return {
    do(){
      const prev = clone(getRelation(id));
      removeRelationById(id);
      removeVisualById(id);
      return { prev };
    },
    undo({ prev }){
      if (!prev) return;
      addRelation(prev);
      addEdgeVisual(prev);
    }
  };
}


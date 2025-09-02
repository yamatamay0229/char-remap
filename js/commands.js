// commands.js — シート対応・単一スタックの Undo/Redo 実装
// 使い方：execute(Entry*) / undo('sheet',{activeSheetId}) / redo('sheet',{activeSheetId})

/**
 * Entry 仕様
 * {
 *   do:   () => any               // 実行。戻り値は undo に渡される payload
 *   undo: (payload:any) => void   // 取り消し
 *   meta: {
 *     kind: 'move'|'layout'|'character'|'relation'|'group'|'io',
 *     scope: 'sheet'|'global',
 *     sheetId?: string,
 *     ids?: string[],
 *     ts?: number
 *   }
 * }
 */
const __VER = 'cmds-2025-09-02a';

const stack = []; let idx = -1;
let index = -1;           // index が実行済み最後
const LIMIT = 100;

function log(...a){ console.debug('[commands]', ...a); }

// ▼ 修正：エントリをフラットに積む（{...entry, undoPayload}）＋ meta フォールバック
export function execute(entry){
  if (!entry.meta) entry.meta = { kind:'unknown', scope:'global', ts:Date.now() };  // 既存履歴救済
  log('EXEC', entry.meta);

  // 未来側を捨てる（分岐防止）
  if (index < stack.length - 1) stack.splice(index + 1);

  // 実行
  const undoPayload = entry.do?.();

  // フラットに保存（★ここが最大の修正点）
  stack.push({ ...entry, undoPayload });

  // 上限
  if (stack.length > LIMIT) stack.shift();
  index = stack.length - 1;
  log('LEN/IDX →', stack.length, index);
}

// ▼ 修正：stack[i] の e に対して e.meta / e.undo を直接参照
export function undo(mode = 'sheet', ctx = {}){
  log('UNDO', mode, ctx, 'idx=', index);
  if (index < 0) return;

  if (mode === 'global') {
    const e = stack[index];
    const m = e.meta || { scope:'global' };
    log('→ pick', m);
    e.undo?.(e.undoPayload);
    index--;
    log('idx→', index);
    return;
  }

  // sheet モード：現在シートに関係あるもの or global を探す
  const target = String(ctx.activeSheetId ?? '');
  let i = index;
  while (i >= 0) {
    const e = stack[i];
    const m = e.meta || {};
    const scope = m.scope || 'global';           // フォールバック
    const isGlobal = scope === 'global';
    const isThisSheet = (m.scope === 'sheet' && String(m.sheetId) === target);
    if (isGlobal || isThisSheet) {
      log('→ pick', m);
      e.undo?.(e.undoPayload);
      index = i - 1;
      log('idx→', index);
      return;
    }
    i--;
  }
  log('→ no-match');
}

export function redo(mode = 'sheet', ctx = {}){
  const last = stack.length - 1;
  log('REDO', mode, ctx, 'idx=', index, 'last=', last);
  if (index >= last) return;

  if (mode === 'global') {
    const e = stack[index + 1];
    const m = e.meta || { scope:'global' };
    log('→ pick', m);
    const redoPayload = e.do?.();
    e.undoPayload = redoPayload;
    index++;
    log('idx→', index);
    return;
  }
  
  // sheet モード：現在シートに関係あるもの or global を探す
  const target = String(ctx.activeSheetId ?? '');
  let i = index + 1;
  while (i <= last) {
    const e = stack[i];
    const m = e.meta || {};
    const scope = m.scope || 'global';
    const isGlobal = scope === 'global';
    const isThisSheet = (scope === 'sheet' && String(m.sheetId) === target);
    if (isGlobal || isThisSheet) {
      log('→ pick', m);
      const redoPayload = e.do?.();
      e.undoPayload = redoPayload;
      index = i;
      log('idx→', index);
      return;
    }
    i++;
  }
  log('→ no-match');
}

export function canUndo(){ return index >= 0; }
export function canRedo(){ return index < stack.length-1; }
export function clear(){ stack.length = 0; index = -1; }

// コンソールで即見れる簡易ダンプ
export function historyMeta(){
  return {
    ver: __VER,
    length: stack.length,
    index,
    items: stack.map((e,i)=>({ i, meta: e.meta }))
  };
}

// ついでに window から触れるように
if (typeof window !== 'undefined') {
  window.__hist = historyMeta;
}

// ===== 代表コマンド群 =====
import {
  addCharacter, updateCharacter, removeCharacterById,
  getCharacter, listRelationsByNode,
  addRelation, updateRelation, removeRelationById,
  getRelation, listSheets, setNodePos
} from './state/index.js';
import {
  addNodeVisual, updateNodeVisual, removeVisualById,
  addEdgeVisual, updateEdgeVisual, setNodePositionVisual
} from './graph.js';

// ユーティリティ：ディープコピー
const clone = (x) => JSON.parse(JSON.stringify(x));

/** 単ノード移動（ドラッグ1回） */
export function EntryMoveNode(sheetId, id, fromPos, toPos){
  const pack = (p)=>({ x: Math.round(p.x), y: Math.round(p.y) });
  fromPos = pack(fromPos); toPos = pack(toPos);

  const apply = (p) => {
    try { setNodePos(sheetId, id, p); } catch(e){}
    try { setNodePositionVisual?.(id, p); } catch(e){}
  };

  return {
    do(){ apply(toPos); return { sheetId, id, fromPos, toPos }; },
    undo({ fromPos }){ apply(fromPos); },
    meta:{ kind:'move', scope:'sheet', sheetId, ids:[id], ts:Date.now() }
  };
}

/** 多数ノードの一括移動（自動配置・物理停止時など） */
export function EntryApplyLayout(sheetId, diffs /* [{id,from,to}] */){
  const pack = (p)=>({ x: Math.round(p.x), y: Math.round(p.y) });
  diffs = (diffs||[]).map(d => ({ id:d.id, from:pack(d.from), to:pack(d.to) }));

  const apply = (key) => {
    for (const d of diffs) {
      try { setNodePos(sheetId, d.id, d[key]); } catch(e){}
      try { setNodePositionVisual?.(d.id, d[key]); } catch(e){}
    }
  };

  return {
    do(){ apply('to'); return { sheetId, diffs }; },
    undo(){ apply('from'); },
    meta:{ kind:'layout', scope:'sheet', sheetId, ids:diffs.map(d=>d.id), ts:Date.now() }
  };
}

/** 人物追加（グローバル） */
export function EntryAddCharacter(data){
  return {
    do(){
      const id = addCharacter(data);
      addNodeVisual({ id, ...data });
      return { id };
    },
    undo({ id }){
      removeCharacterById(id);
      removeVisualById(id);
    },
    meta:{ kind:'character', scope:'global', ts:Date.now() }
  };
}

/** 人物更新（グローバル） */
export function EntryUpdateCharacter(id, patch){
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
    },
    meta:{ kind:'character', scope:'global', ids:[id], ts:Date.now() }
  };
}

/** 人物削除（グローバル） */
export function EntryRemoveCharacter(id){
  return {
    do(){
      const char = clone(getCharacter(id));
      const rels = clone(listRelationsByNode(id));
      // シート内の座標を保存
      const posBySheet = {};
      for (const s of listSheets()) {
        const p = s.positions?.[id];
        if (p) posBySheet[s.id] = p;
      }
      removeCharacterById(id);
      removeVisualById(id);
      return { char, rels, posBySheet };
    },
    undo({ char, rels, posBySheet }){
      if (!char) return;
      addCharacter(char);
      addNodeVisual({ id: char.id, name: char.name, nodeColor: char.nodeColor, textColor: char.textColor, image: char.image });
      // 座標復元
      for (const [sheetId, pos] of Object.entries(posBySheet||{})) {
        try { setNodePos(sheetId, char.id, pos); } catch(e){}
        try { setNodePositionVisual?.(char.id, pos); } catch(e){}
      }
      // 関係復元
      for (const r of (rels||[])) {
        addRelation(r);
        addEdgeVisual(r);
      }
    },
    meta:{ kind:'character', scope:'global', ids:[id], ts:Date.now() }
  };
}

/** 関係追加（グローバル） */
export function EntryAddRelation(payload){
  return {
    do(){
      const id = addRelation(payload);
      addEdgeVisual({ id, ...payload });
      return { id };
    },
    undo({ id }){
      removeRelationById(id);
      removeVisualById(id);
    },
    meta:{ kind:'relation', scope:'global', ts:Date.now() }
  };
}

/** 関係更新（グローバル） */
export function EntryUpdateRelation(id, patch){
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
    },
    meta:{ kind:'relation', scope:'global', ids:[id], ts:Date.now() }
  };
}

/** 関係削除（グローバル） */
export function EntryRemoveRelation(id){
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
    },
    meta:{ kind:'relation', scope:'global', ids:[id], ts:Date.now() }
  };
}

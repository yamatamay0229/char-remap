// アプリデータの唯一の真実（No-Opで壊れない骨だけ）

const snapshot = {
  version: 1,
  characterTags: [],
  characters: [],      // {id,name,attrs?,image?,nodeColor?,textColor?,pos?}
  relations: [],       // {id,from,to,label?,strength?,type?,mutual?,edgeColor?,textColor?}
  groups: [],          // {id,name,color?,members[]}
  sheets: [ { id:'default', name:'Default', positions:{}, waypoints:{}, visible:{} } ],
};
export const CURRENT_VERSION = 2;

export const state = {
  version: CURRENT_VERSION,
  characterTags: [],
  characters: [],   // {id,name,image?,nodeColor?,textColor?,attrs?, ...}
  relations: [],    // {id,from,to,label?,strength?,type?,mutual?,edgeColor?,textColor?}
  groups: [],       // {id,name,color?,members:[]}
  sheets: []        // {id,name,positions:{[charId]:{x,y}},waypoints:{[relId]:[{x,y}]},visible:{}}
};

// ---- ヘルパ ----
let _seq = 1;
// ディープコピーで返す
export function getSnapshot(){
  return JSON.parse(JSON.stringify({
    app: 'char-relmap',
    version: state.version ?? CURRENT_VERSION,
    createdAt: state.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    characterTags: state.characterTags,
    characters: state.characters,
    relations: state.relations,
    groups: state.groups,
    sheets: state.sheets
  }));
}

// 外部データの受け入れ口（migrate → validate → set）
export function setDataFromSnapshot(raw){
  const snap = migrateSnapshot(raw);
  const v = validateSnapshot(snap);
  if (!v.ok) throw new Error('データ不正: ' + v.errors.join('; '));

  state.version = snap.version;
  state.characterTags = snap.characterTags || [];
  state.characters    = snap.characters    || [];
  state.relations     = snap.relations     || [];
  state.groups        = snap.groups        || [];
  state.sheets        = snap.sheets        || [];
}
export function setData(/*snap*/){ /* TODO: migrate & assign */ }
// 未知の未来バージョンは拒否。古い場合は段階的に上げる。
export function migrateSnapshot(raw){
  if (!raw || typeof raw !== 'object') throw new Error('無効なデータ');
  if (raw.app && raw.app !== 'char-relmap') throw new Error('別アプリのデータです');
  let snap = JSON.parse(JSON.stringify(raw));
  let v = Number(snap.version || 1);

  if (v > CURRENT_VERSION) {
    throw new Error(`このアプリ（v${CURRENT_VERSION}) では v${v} は開けません`);
  }
  while (v < CURRENT_VERSION) {
    const fn = migrations[v];
    if (!fn) throw new Error(`v${v} から v${v+1} へのマイグレーション未実装`);
    snap = fn(snap);
    v = Number(snap.version);
  }
  // 最終版の形を最低限整える
  snap.app = 'char-relmap';
  snap.version = CURRENT_VERSION;
  snap.characterTags ||= [];
  snap.characters    ||= [];
  snap.relations     ||= [];
  snap.groups        ||= [];
  snap.sheets        ||= [];
  return snap;
}

// 超軽量バリデーション（必要に応じて強化）
export function validateSnapshot(snap){
  const errors = [];
  if (snap.app !== 'char-relmap') errors.push('appが不一致');
  if (typeof snap.version !== 'number') errors.push('versionが数値でない');
  const id = x => typeof x === 'string' && x.length>0;

  for (const c of (snap.characters||[])) {
    if (!id(String(c.id||c.name))) errors.push('character.id が無い');
  }
  for (const r of (snap.relations||[])) {
    if (!id(String(r.from)) || !id(String(r.to))) errors.push('relation.from/to が無い');
  }
  return { ok: errors.length===0, errors };
}
export function generateId(prefix = 'id') {
  return `${prefix}_${(_seq++).toString(36)}`;
}

// Selectors
export function getCharacter(id) {
  return state.characters.find(c => String(c.id) === String(id)) || null;
}
export function listCharacters(){ return snapshot.characters; }
export function getRelation(id){
  return state.relations.find(r => String(r.id) === String(id)) || null;
}
export function listRelations(){ return snapshot.relations; }
export function listRelationsByNode(/*charId*/){ /* TODO */ }
export function listRelationsByPair(/*a,b*/){ /* TODO */ }
export function getGroup(/*id*/){ /* TODO */ }
export function listGroups(){ return snapshot.groups; }
export function getTagKeys(){ return snapshot.characterTags; }

function ensureAttrs(c) {
  if (!c.attrs) c.attrs = {};
  // 既存タグキーぶんの穴を埋める
  state.characterTags.forEach(k => { if (!(k in c.attrs)) c.attrs[k] = ""; });
  return c;
}

// Characters CRUD
// ==================================================
// 1) addCharacter: 人物を追加（ID重複チェック + attrs整形）
//    返り値: 追加した id
// ==================================================
export function addCharacter(input) {
  if (!input || !input.name) throw new Error('名前は必須です');
  const id = String(input.id ?? generateId('ch'));

  if (state.characters.some(c => String(c.id) === id)) {
    throw new Error('IDが重複しています');
  }

  // ベース構築
  const char = ensureAttrs({
    id,
    name: String(input.name),
    image: input.image ?? null,
    nodeColor: input.nodeColor ?? null,
    textColor: input.textColor ?? null,
    attrs: { ...(input.attrs || {}) },
    // 既定の座標はグローバルposに置かない（シート別管理が原則）
  });

  state.characters.push(char);
  return id;
}
// ==================================================
// 2) updateCharacter: 人物を部分更新（存在チェック + attrsマージ）
// ==================================================
export function updateCharacter(id, patch = {}) {
  const idx = state.characters.findIndex(c => String(c.id) === String(id));
  if (idx < 0) throw new Error('人物が見つかりません');

  const prev = state.characters[idx];
  const next = {
    ...prev,
    ...patch,
    attrs: { ...(prev.attrs || {}), ...(patch.attrs || {}) }
  };
  ensureAttrs(next);

  // IDの変更は許可しない（整合性崩壊防止）
  next.id = prev.id;

  state.characters[idx] = next;
}
// ==================================================
// 3) removeCharacterById: 人物を削除
//    - relations から関連エッジも除去
//    - 各 sheet.positions からも座標を削除
// ==================================================
export function removeCharacterById(id) {
  const sid = String(id);
  const before = state.characters.length;
  state.characters = state.characters.filter(c => String(c.id) !== sid);
  if (state.characters.length === before) return; // 見つからなければ何もしない

  // 関連する関係線を削除
  state.relations = state.relations.filter(r => r.from !== sid && r.to !== sid);

  // 各シートの座標・可視対象から除去
  state.sheets.forEach(s => {
    if (s.positions && s.positions[sid]) delete s.positions[sid];
    if (s.visible?.characters) {
      s.visible.characters = s.visible.characters.filter(x => x !== sid);
    }
  });
}

// Relations CRUD
export function addRelation(input){
  if (!input) throw new Error('関係データが空です');
  const from = String(input.from), to = String(input.to);
  if (from === to) throw new Error('同一人物には接続できません');
  if (!getCharacter(from) || !getCharacter(to)) throw new Error('人物IDが不正です');

  const id = String(input.id ?? generateId('rel'));
  state.relations.push({
    id,
    from, to,
    label: input.label ?? '',
    strength: Number(input.strength ?? 3),
    type: input.type ?? '',
    mutual: !!input.mutual,
    edgeColor: input.edgeColor ?? null,
    textColor: input.textColor ?? null
  });
  return id;
}

export function updateRelation(id, patch={}){
  const i = state.relations.findIndex(r => String(r.id) === String(id));
  if (i < 0) throw new Error('関係が見つかりません');
  const prev = state.relations[i];
  const next = { ...prev, ...patch };
  // from/to の変更が来た場合も検証
  if (next.from === next.to) throw new Error('同一人物には接続できません');
  if (!getCharacter(next.from) || !getCharacter(next.to)) throw new Error('人物IDが不正です');
  state.relations[i] = next;
}

export function removeRelationById(id){
  state.relations = state.relations.filter(r => String(r.id) !== String(id));
  // シート内のウェイポイントも掃除（将来のため）
  state.sheets.forEach(s => {
    if (s.waypoints && s.waypoints[id]) delete s.waypoints[id];
    if (s.visible?.relations) {
      s.visible.relations = s.visible.relations.filter(x => x !== id);
    }
  });
}

// Groups CRUD
export function addGroup(/*g*/){ /* TODO return id */ }
export function updateGroup(/*id, patch*/){ /* TODO */ }
export function removeGroupById(/*id*/){ /* TODO */ }
export function addMembers(/*groupId, charIds*/){ /* TODO */ }
export function removeMembers(/*groupId, charIds*/){ /* TODO */ }

// Tags
export function setCharacterTags(/*keys*/){ /* TODO */ }
export function addTagKey(/*key*/){ /* TODO */ }
export function renameTagKey(/*oldKey,newKey*/){ /* TODO */ }
export function removeTagKey(/*key*/){ /* TODO */ }
export function reorderTagKeys(/*newOrder*/){ /* TODO */ }

// Sheets
// ==================================================
// 4) createSheet: シート新規作成（座標/経路/可視は空で開始）
//    返り値: 作成した sheet の id
// ==================================================
export function createSheet(name = 'Sheet') {
  const id = generateId('sheet');
  state.sheets.push({
    id,
    name: String(name),
    positions: {},          // charId -> {x,y}
    waypoints: {},          // relId  -> [{x,y}, ...]
    visible: {}             // { characters?:[], relations?:[], groups?:[] }
  });
  return id;
}
export function renameSheet(/*id,name*/){ /* TODO */ }
export function deleteSheet(/*id*/){ /* TODO */ }

// ==================================================
// 5) setNodePos: 指定シート内で人物の座標を保存
//    - シート必須
//    - pos: {x:number, y:number}
// ==================================================
export function setNodePos(sheetId, charId, pos) {
  const s = getSheet(sheetId);
  if (!s) throw new Error('シートが見つかりません');
  if (!getCharacter(charId)) throw new Error('人物が見つかりません');

  const x = Number(pos?.x), y = Number(pos?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error('座標が不正です');
  }
  if (!s.positions) s.positions = {};
  s.positions[String(charId)] = { x, y };
}
export function setEdgeWaypoints(/*sheetId,relId,points*/){ /* TODO */ }
export function setSheetVisibility(/*sheetId,visible*/){ /* TODO */ }
export function getSheet(id) {
  return state.sheets.find(s => s.id === id) || null;
}
export function listSheets(){ return snapshot.sheets; }

// Integrity
export function existsCharacter(/*id*/){ /* TODO */ }
export function existsRelation(/*id*/){ /* TODO */ }
export function existsGroup(/*id*/){ /* TODO */ }
export function relinkAfterDelete(/*id*/){ /* TODO */ }

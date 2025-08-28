// state.js — データの源泉（characters / relations / tags）
export const SCHEMA_VERSION = 2;

function rid(prefix='id_'){
  try { return prefix + crypto.getRandomValues(new Uint32Array(1))[0].toString(36); }
  catch { return prefix + Math.random().toString(36).slice(2); }
}

export const state = {
  version: SCHEMA_VERSION,
  characterTags: [],     // 例: ["性格","体格"]
  characters: [],        // 例: {id,name,image?,nodeColor?,textColor?,pos?:{x,y},attrs?:{[k]:string}}
  relations: [],         // 例: {id,from,to,label?,strength?,type?,mutual?,edgeColor?,textColor?,status?}
};

/** 読み込み（旧形式も受け取れる）。x,y→pos、relation.id 付与など。 */
export function setData(charsOrObj, relsMaybe){
  if (Array.isArray(charsOrObj)) {
    _setData({ characters: charsOrObj, relations: Array.isArray(relsMaybe) ? relsMaybe : [] });
  } else {
    _setData(charsOrObj || {});
  }
}
function _setData({ characters = [], relations = [], characterTags = [], version = SCHEMA_VERSION }){
  state.characters = characters.map(c => {
    const pos = c.pos ?? (Number.isFinite(c.x) && Number.isFinite(c.y) ? { x:c.x, y:c.y } : undefined);
    const attrs = c.attrs ?? {};
    return { ...c, pos, attrs };
  });
  state.relations = relations.map((r, i) => ({
    id: r.id ? String(r.id) : rid('rel_'),
    from: String(r.from),
    to: String(r.to),
    label: r.label || '',
    strength: r.strength ?? 3,
    type: r.type || 'unspecified',
    mutual: !!r.mutual,
    edgeColor: r.edgeColor ?? null,
    textColor: r.textColor ?? null,
    status: r.status || 'active',
  }));
  setCharacterTags(characterTags);
  state.version = version || SCHEMA_VERSION;
}

export function setCharacterTags(tags){
  state.characterTags = Array.from(new Set((tags||[]).map(t => String(t))));
  state.characters.forEach(c => {
    c.attrs ||= {};
    state.characterTags.forEach(k => { if (!(k in c.attrs)) c.attrs[k] = ""; });
  });
}

// 追加・更新・削除 API
export function addCharacter({ id, name, image=null, nodeColor=null, textColor=null, attrs={}, pos }){
  const sid = String(id);
  if (state.characters.some(c => String(c.id ?? c.name) === sid)) throw new Error('IDが重複しています');
  const filled = { ...attrs };
  state.characterTags.forEach(k => { if (!(k in filled)) filled[k] = ""; });
  const c = { id: sid, name, image, nodeColor, textColor, attrs: filled };
  if (pos && Number.isFinite(pos.x) && Number.isFinite(pos.y)) c.pos = { x: pos.x, y: pos.y };
  state.characters.push(c);
}
export function updateCharacter(id, patch){
  const sid = String(id);
  const i = state.characters.findIndex(c => String(c.id ?? c.name) === sid);
  if (i < 0) throw new Error('人物が見つかりません');
  const cur = state.characters[i];
  const next = { ...cur, ...patch, attrs: { ...(cur.attrs||{}), ...(patch.attrs||{}) } };
  if (Number.isFinite(patch?.x) && Number.isFinite(patch?.y)) next.pos = { x: patch.x, y: patch.y };
  state.characters[i] = next;
}
export function removeCharacterById(id){
  const sid = String(id);
  state.characters = state.characters.filter(c => String(c.id ?? c.name) !== sid);
  state.relations  = state.relations.filter(r => r.from !== sid && r.to !== sid);
}

export function addRelation({ id, from, to, label, strength=3, type='unspecified', mutual=false, edgeColor=null, textColor=null, status='active' }){
  if (String(from) === String(to)) throw new Error('同一人物同士は不可');
  const rel = { id: id ? String(id) : rid('rel_'), from:String(from), to:String(to), label:label||'', strength, type, mutual:!!mutual, edgeColor, textColor, status };
  state.relations.push(rel);
  return rel.id;
}
export function updateRelation(id, patch){
  const sid = String(id);
  const i = state.relations.findIndex(r => String(r.id) === sid);
  if (i < 0) throw new Error('関係が見つかりません');
  state.relations[i] = { ...state.relations[i], ...patch, id: sid };
}
export function removeRelationById(id){
  const sid = String(id);
  state.relations = state.relations.filter(r => String(r.id) !== sid);
}
export function removeRelationPredicate(pred){
  state.relations = state.relations.filter(r => !pred(r));
}

// 補助
export function findRelationIndex(pred){ return state.relations.findIndex(pred); }
export function findCharacter(id){ return state.characters.find(c => String(c.id) === String(id)) || null; }

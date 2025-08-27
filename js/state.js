export const GRID = 50;
export const COLOR_BY_TYPE = { "感情":"#ef4444","家族":"#3b82f6","敵対":"#111827","組織":"#10b981" };

export const state = {
  characterTags: [],  // 例: ["性格","体格"]  — 共通のタグキー（ユーザーが管理）
  characters: [],     // [{id,name,image,nodeColor?,textColor?,x?,y?, attrs?: {性格:"",体格:""...}}]
  relations: []       // [{from,to,label,strength,mutual,type, edgeColor?, textColor?}]
};

export function setData(chars, rels){
  state.characters = Array.isArray(chars) ? chars : [];
  state.relations  = Array.isArray(rels) ? rels : [];
  // 既存データに attrs の空オブジェクトを付与しておく
  state.characters.forEach(c => { if (!c.attrs) c.attrs = {}; });
}

export function setCharacterTags(tags){
  state.characterTags = Array.from(new Set(tags.map(t => String(t))));
  // 既存キャラに未定義キーを追加
  state.characters.forEach(c => {
    if (!c.attrs) c.attrs = {};
    state.characterTags.forEach(k => { if (!(k in c.attrs)) c.attrs[k] = ""; });
  });
}

export function addCharacter({id, name, image=null, nodeColor=null, textColor=null, attrs={}}){
  id = String(id);
  if (state.characters.some(c => String(c.id ?? c.name) === id)) {
    throw new Error('IDが重複しています');
  }
  // 既存タグに合わせて attrs を整える
  const filled = {...attrs};
  state.characterTags.forEach(k => { if (!(k in filled)) filled[k] = ""; });
  state.characters.push({ id, name, image, nodeColor, textColor, attrs: filled });
}

export function updateCharacter(id, patch){
  const i = state.characters.findIndex(c => String(c.id ?? c.name) === String(id));
  if (i < 0) throw new Error('人物が見つかりません');
  const c = state.characters[i];
  state.characters[i] = { ...c, ...patch, attrs: { ...(c.attrs||{}), ...(patch.attrs||{}) } };
}

export function removeCharacterById(id){
  id = String(id);
  state.characters = state.characters.filter(c => String(c.id ?? c.name) !== id);
  state.relations  = state.relations.filter(r => r.from !== id && r.to !== id);
}

export function addRelation({from, to, label, strength=3, type="", mutual=false, edgeColor=null, textColor=null}){
  if (from === to) throw new Error('同一人物同士は不可');
  state.relations.push({ from, to, label, strength, type, mutual, edgeColor, textColor });
}

export function updateRelation(index, patch){
  if (index < 0 || index >= state.relations.length) throw new Error('関係が見つかりません');
  state.relations[index] = { ...state.relations[index], ...patch };
}

export function findRelationIndex(pred){
  return state.relations.findIndex(pred);
}

export function removeRelationPredicate(pred){
  state.relations = state.relations.filter(r => !pred(r));
}

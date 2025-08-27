export const GRID = 50;
export const COLOR_BY_TYPE = { "感情":"#ef4444","家族":"#3b82f6","敵対":"#111827","組織":"#10b981" };

export const state = {
  characters: [],   // [{id, name, image, x?, y?}]
  relations: []     // [{from, to, label, strength, mutual, type}]
};

export function setData(chars, rels){
  state.characters = Array.isArray(chars) ? chars : [];
  state.relations  = Array.isArray(rels) ? rels : [];
}

export function addCharacter({id, name, image=null}){
  if (state.characters.some(c => String(c.id ?? c.name) === id)) {
    throw new Error('IDが重複しています');
  }
  state.characters.push({ id, name, image });
}

export function removeCharacterById(id){
  state.characters = state.characters.filter(c => String(c.id ?? c.name) !== id);
  state.relations  = state.relations.filter(r => r.from !== id && r.to !== id);
}

export function addRelation({from, to, label, strength=3, type="", mutual=false}){
  if (from === to) throw new Error('同一人物同士は不可');
  state.relations.push({ from, to, label, strength, type, mutual });
}

export function removeRelationPredicate(pred){
  state.relations = state.relations.filter(r => !pred(r));
}

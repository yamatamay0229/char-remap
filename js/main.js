import { setData, setCharacterTags } from './state.js';
import { bootCytoscape } from './graph.js';
import { wireUI } from './ui.js';
import { applyTheme } from './settings.js';

async function tryFetchJson(url){
  try { const r = await fetch(url); if(!r.ok) throw 0; return await r.json(); } catch { return null; }
}

(async function start(){
  const combined = await tryFetchJson('./data/graph.json');
  if (combined && Array.isArray(combined.characters) && Array.isArray(combined.relations)) {
    if (Array.isArray(combined.characterTags)) setCharacterTags(combined.characterTags);
    setData(combined.characters, combined.relations);
  } else {
    const [chars, rels] = await Promise.all([
      tryFetchJson('./data/characters.json') || [], tryFetchJson('./data/relations.json') || []
    ]);
    setData(chars, rels);
  }

  const cy = bootCytoscape();
  // グローバルに参照（編集UIが使う）
  window.cy = cy;

  wireUI();
})();

import { setData, setCharacterTags } from './state.js';
import { applyTheme } from './settings.js';
import * as grid from './grid.js';
import { bootCytoscape } from './graph.js';
import { wireUI } from './ui.js';

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

  // グリッド：container (#graph) を渡す。cy取得関数は後から注入
  const container = document.getElementById('graph');
	let cy = null;
	grid.init(container, { getCy: () => cy }); // ← cy 参照は関数で遅延解決

	// Cytoscapeを起動
	cy = bootCytoscape();

	// UI配線（必要なら cy を渡す）
	wireUI(cy);
})();

import { setData } from './state.js';
import { bootCytoscape } from './graph.js';
import { wireUI } from './ui.js';

async function tryFetchJson(url){
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.statusText);
    return await res.json();
  } catch { return null; }
}

(async function start(){
  // 1) まとめJSONを優先
  const combined = await tryFetchJson('./data/graph.json');

  if (combined && Array.isArray(combined.characters) && Array.isArray(combined.relations)) {
    setData(combined.characters, combined.relations);
  } else {
    // 2) 個別JSONにフォールバック
    const [chars, rels] = await Promise.all([
      tryFetchJson('./data/characters.json') || [],
      tryFetchJson('./data/relations.json')  || []
    ]);
    setData(chars, rels);
  }

  bootCytoscape();
  wireUI();
})();

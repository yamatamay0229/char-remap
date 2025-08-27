import { setData, state } from './state.js';
import { bootCytoscape } from './graph.js';
import { wireUI } from './ui.js';

(async function start(){
  const [chars, rels] = await Promise.all([
    fetch('./data/characters.json').then(r=>r.json()).catch(()=>[]),
    fetch('./data/relations.json').then(r=>r.json()).catch(()=>[])
  ]);
  setData(chars, rels);

  bootCytoscape();
  wireUI();

  // 参考：初期化ログ
  console.log('characters', state.characters);
  console.log('relations', state.relations);
})();

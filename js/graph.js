// Cytoscape起動/シート反映など（No-Opで安全に）

import { setNodePos, getSheet, listCharacters, listRelations } from './state/index.js';
import { settings } from './settings.js';

let cy = null;

export function bootCytoscape(){
  if (typeof cytoscape !== 'function') {
    console.warn('[graph] cytoscape not loaded; using null cy');
    return null;
  }
  cy = cytoscape({
    container: document.getElementById('graph'),
    elements: [], style: [], layout:{ name:'preset' },
    wheelSensitivity: 0.2,
  });
  bindViewportSync(cy);
  bindDragSnap(cy);
  return cy;
}

// シート適用（座標だけ反映）
export function applySheet(sheetId){
  if (!cy) return;
  console.debug('[graph.applySheet] noop');
  const s = getSheet(sheetId);
  if (!s || !s.positions) return;
  cy.nodes().forEach(n => {
    const p = s.positions[n.id()];
    if (p) n.position(p);
  });
}

export function addNodeVisual(character){
  if (!cy) return;
  const { id, name, nodeColor, textColor, pos } = character;
  cy.add({
    group: 'nodes',
    data: {
      id,
      label: name || id,
      nodeColor: nodeColor || '#cccccc',
      textColor: textColor || '#111111'
    },
    position: pos || { x: 0, y: 0 }
  });
}
export function updateNodeVisual(/*id, patch*/){ /* TODO */ }
export function removeVisualById(/*id*/){ /* TODO */ }
export function addEdgeVisual(/*relation*/){ /* TODO */ }
export function updateEdgeVisual(/*id, patch*/){ /* TODO */ }
export function centerOn(/*idsOrId*/){ /* TODO */ }
export function fitAll(/*padding*/){ /* TODO */ }

export function bindViewportSync(cy){
  if (!cy) return;
  cy.on('viewport', () => {
    // TODO: grid.scheduleRedraw()
  });
}
export function bindDragSnap(cy){
  cy.on('dragfree', 'node', (evt) => {
    const n = evt.target;
    const p = n.position();
    const sheetId = settings.activeSheetId || 'default';
    try {
      setNodePos(sheetId, n.id(), { x: p.x, y: p.y });
    } catch (e) {
      console.warn('[dragfree] setNodePos failed', e);
    }
  });
}

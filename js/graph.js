// Cytoscape起動/シート反映など（No-Opで安全に）

import { listCharacters, listRelations } from './state/index.js';

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

export function applySheet(/*sheetId*/){
  if (!cy) return;
  console.debug('[graph.applySheet] noop');
}

export function addNodeVisual(/*character*/){ /* TODO */ }
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
  if (!cy) return;
  // TODO: drag during snap / dragfree -> state.setNodePos(...)
}

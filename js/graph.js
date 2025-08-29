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
    elements: [], style: [
      // ノードの基本
      { selector: 'node', style: {
        'shape': 'round-rectangle',
        'width': 120,
        'height': 140,
        'background-color': '#e5e7eb',
        'border-width': 2,
        'border-color': '#9ca3af',
        'background-image': 'data(image)',                 // 画像URLを data(image) に入れる
        'background-fit': 'cover',
        'background-clip': 'node',
        'background-image-crossorigin': 'anonymous',
        'label': 'data(label)',
        'color': 'data(textColor)',
        'font-size': 14,
        'text-wrap': 'wrap',
        'text-max-width': 110,
        'text-halign': 'center',
        'text-valign': 'bottom',
        'text-margin-y': 8
      }},
      // エッジの基本
      { selector: 'edge', style: {
        'curve-style': 'bezier',
        'width': 'mapData(strength, 1, 8, 2, 8)',
        'line-color': 'data(edgeColor)',
        'target-arrow-color': 'data(edgeColor)',
        'source-arrow-color': 'data(edgeColor)',
        'target-arrow-shape': 'triangle',
        'label': 'data(label)',
        'font-size': 12,
        'color': 'data(textColor)',
        'text-background-opacity': 0.7,
        'text-background-color': '#000',
        'text-background-shape': 'round-rectangle',
        'text-background-padding': 2
      }},
      // 相互フラグで両矢印
      { selector: 'edge[mutual = 1]', style: {
        'source-arrow-shape': 'triangle'
      }},
      // 選択時の強調
      { selector: 'node:selected', style: { 'border-color': '#6366f1', 'border-width': 3 } },
      { selector: 'edge:selected', style: { 'line-color': '#6366f1', 'target-arrow-color': '#6366f1', 'source-arrow-color': '#6366f1' } }
    ], 
    layout:{ name:'preset' },
    // ← ズーム感度アップ
    wheelSensitivity: 1,
    minZoom: 0.1,
    maxZoom: 4,
    boxSelectionEnabled: true
  });
  
  bindViewportSync(cy);
  bindDragSnap(cy);
  // 起動時に少し拡大＆中心へ（空でも有害ではない）
  cy.zoom(1.2);
  cy.center();
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
  const { id, name, nodeColor='#e5e7eb', textColor='#111111', image=null, pos } = character;
  cy.add({
    group: 'nodes',
    data: { id, label: name || id, nodeColor, textColor, image },
    position: pos || { x: 0, y: 0 }
  }).addClass('with-image'); // クラスは今後の拡張用
}

export function updateNodeVisual(id, patch){
  if (!cy) return;
  const node = cy.getElementById(String(id));
  if (!node || node.empty()) return;

  // ラベル更新
  if (patch.name !== undefined) {
    node.data('label', patch.name);
  }
  // 色更新
  if (patch.nodeColor !== undefined) {
    node.style('background-color', patch.nodeColor);
  }
  if (patch.textColor !== undefined) {
    node.style('color', patch.textColor);
  }
  // 他に image, attrs など扱いたければ後で拡張
}

export function addEdgeVisual(rel){
  if (!cy) return;
  const { id, from, to, label, strength=3, edgeColor='#888888', textColor='#ffffff', mutual=false } = rel;
  cy.add({
    group: 'edges',
    data: {
      id,
      source: from,
      target: to,
      label: label || '',
      strength,
      edgeColor,
      textColor,
      mutual: mutual ? 1 : 0
    }
  });
}

export function updateEdgeVisual(id, patch){
  if (!cy) return;
  const e = cy.getElementById(String(id));
  if (!e || e.empty()) return;
  // 端点変更がある場合（めったにない）は一旦削除→再追加でもOKだが、最小は data 更新だけ
  const dataPatch = {};
  if ('label' in patch) dataPatch.label = patch.label;
  if ('strength' in patch) dataPatch.strength = Number(patch.strength);
  if ('edgeColor' in patch) dataPatch.edgeColor = patch.edgeColor;
  if ('textColor' in patch) dataPatch.textColor = patch.textColor;
  if ('mutual' in patch) dataPatch.mutual = patch.mutual ? 1 : 0;
  e.data({ ...e.data(), ...dataPatch });
}

export function removeVisualById(id){
  if (!cy) return;
  cy.getElementById(String(id)).remove();
}

export function centerOn(/*idsOrId*/){ /* TODO */ }
export function fitAll(/*padding*/){ /* TODO */ }

export function bindViewportSync(cy){
  if (!cy) return;
  cy.on('viewport', () => grid.scheduleRedraw());
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

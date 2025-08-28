// graph.js
// A案（CDN利用）：importなし。window.cytoscape を使う
// B案（ESM利用）：import cytoscape from 'cytoscape';

import * as grid from './grid.js';
import { state } from './state.js';
import { settings } from './settings.js';

/** [HOOK] グラフ本体の起動（elements/style/layout/イベント購読） */
export function bootCytoscape(){
  const cy = (window.cytoscape ?? cytoscape)({
    container: document.getElementById('graph'),

    // --- elements（ノード/エッジ） ---
    elements: {
      nodes: state.characters.map(c => ({
        data: { id: String(c.id), label: c.name, image: c.image ?? null,
                nodeColor: c.nodeColor ?? null, textColor: c.textColor ?? null },
        position: c.pos ? { x: c.pos.x, y: c.pos.y } : undefined,
      })),
      edges: state.relations.map((r, i) => ({
        data: {
          id: r.id ? String(r.id) : `rel_${i}`,
          source: String(r.from), target: String(r.to),
          label: r.label || '', strength: r.strength ?? 3,
          type: r.type || 'unspecified', mutual: !!r.mutual,
          edgeColor: r.edgeColor ?? null, textColor: r.textColor ?? null,
          status: r.status || 'active',
        }
      })),
    },

    // --- style（見た目） ---
    style: [
      { selector: 'node', style: {
          'shape': 'round-rectangle',
          'background-color': ele => ele.data('nodeColor') || 'var(--node-bg)',
          'label': 'data(label)',
          'color': ele => ele.data('textColor') || 'var(--node-fg)',
          'font-size': 12, 'text-valign':'center', 'text-halign':'center',
          'padding': '8px', 'border-width':1, 'border-color':'var(--border)',
          'background-image': ele => ele.data('image') ? ele.data('image') : 'none',
          'background-fit': 'cover',
      }},
      { selector: 'edge', style: {
          'curve-style':'bezier',
          'width': ele => Math.max(1, Number(ele.data('strength')||3)),
          'line-color': ele => ele.data('edgeColor') || '#6b7280',
          'target-arrow-shape':'triangle',
          'target-arrow-color': ele => ele.data('edgeColor') || '#6b7280',
          'source-arrow-shape': ele => ele.data('mutual') ? 'triangle':'none',
          'source-arrow-color': ele => ele.data('edgeColor') || '#6b7280',
          'label':'data(label)', 'font-size':11, 'text-rotation':'autorotate',
          'text-background-color':'#fff','text-background-opacity':0.8,'text-background-padding':'2px',
          'color': ele => ele.data('textColor') || 'var(--edge-fg)',
          'opacity': ele => ele.data('status')==='ended'?0.4:1,
          'line-style': ele => ele.data('status')==='ended'?'dotted':'solid',
      }},
      { selector: 'node:selected', style:{ 'border-width':2, 'border-color':'#3b82f6' }},
      { selector: 'edge:selected', style:{ 'line-color':'#3b82f6', 'target-arrow-color':'#3b82f6', 'source-arrow-color':'#3b82f6' }},
    ],

    // --- layout（初期配置） ---
    layout: { name:'preset', fit:true, padding:50 },
    wheelSensitivity: 0.2,
  });

  // --- viewport同期（グリッドを間引き再描画） ---
  cy.on('viewport', () => grid.scheduleRedraw());
  grid.redraw();

  // --- ドラッグ：スナップ & 位置保存 ---
  cy.on('drag', 'node', (e) => {
    if (!settings.snap) return;
    const g = settings.gridSize || 50;
    const n = e.target, p = n.position();
    n.position({ x: Math.round(p.x / g) * g, y: Math.round(p.y / g) * g });
  });
  cy.on('dragfree', 'node', (e) => {
    const n = e.target, id = n.id(), p = n.position();
    const c = state.characters.find(c => String(c.id) === id);
    if (c) c.pos = { x: p.x, y: p.y };
  });

  return cy;
}

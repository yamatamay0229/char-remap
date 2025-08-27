import { GRID, COLOR_BY_TYPE, state, removeCharacterById, removeRelationPredicate } from './state.js';

let cy;

function elementsFromState(){
  const nodes = state.characters.map(c => ({
    data: {
      id: String(c.id ?? c.name),
      name: c.name ?? String(c.id ?? ""),
      image: c.image ?? null,
      nodeColor: c.nodeColor || null,
      textColor: c.textColor || null
    },
    position: (c.x!=null && c.y!=null) ? {x:c.x, y:c.y} : undefined
  }));
  const edges = state.relations.map((r,i)=>({
    data: {
      id:'e'+i,
      source:String(r.from), target:String(r.to),
      label:r.label??'',
      strength:Number(r.strength??3),
      type:r.type??'',
      mutual:!!r.mutual,
      edgeColor: r.edgeColor || null,
      textColor: r.textColor || null
    },
    classes: r.mutual ? 'mutual' : ''
  }));
  return { nodes, edges };
}

export function bootCytoscape(){
  const { nodes, edges } = elementsFromState();
  cy = cytoscape({
    container: document.getElementById('graph'),
    elements: { nodes, edges },
    layout: { name: 'random' },
    wheelSensitivity: .2,
    style: [
      { selector:'node', style:{
        'shape':'round-rectangle','width':110,'height':120,
        'background-color': nodeBgColor,          // data(nodeColor) 優先
        'background-image':'data(image)','background-fit':'cover',
        'border-color':'#9ca3af','border-width':2,
        'label':'data(name)','text-wrap':'wrap','text-valign':'bottom','text-halign':'center',
        'color': nodeTextColor,                   // data(textColor) 優先
        'text-background-opacity': .7,'text-background-color':'#fff','text-margin-y':8,'font-size':12
      }},
      { selector:'edge', style:{
        'curve-style':'bezier',
        'line-color': edgeLineColor,              // data(edgeColor) 優先
        'target-arrow-color': edgeLineColor,
        'width':'mapData(strength,1,5,2,8)',
        'label':'data(label)','font-size':11,
        'color': edgeTextColor,                   // data(textColor) 優先
        'text-background-opacity': .8,'text-background-color':'#fff','text-background-padding':2,
        'target-arrow-shape':'triangle'
      }},
      { selector:'edge.mutual', style:{ 'source-arrow-shape':'triangle','source-arrow-color': edgeLineColor }},
      { selector:'node:selected', style:{ 'border-color':'#2563eb','border-width':3 }},
      { selector:'edge:selected', style:{ 'line-color':'#2563eb','target-arrow-color':'#2563eb','source-arrow-color':'#2563eb' }}
    ]
  });

  // グリッドスナップ＆座標保存
  cy.on('free','node', e=>{
    if (!document.getElementById('chk-snap').checked) return;
    const n = e.target, p = n.position();
    n.position({ x: Math.round(p.x/GRID)*GRID, y: Math.round(p.y/GRID)*GRID });
    const id = n.id();
    const i = state.characters.findIndex(c => String(c.id ?? c.name) === id);
    if (i >= 0){ state.characters[i].x = n.position().x; state.characters[i].y = n.position().y; }
  });

  return cy;
}

export function reloadGraphFromState(){
  const { nodes, edges } = elementsFromState();
  cy.elements().remove();
  cy.add(nodes);
  cy.add(edges);
  cy.layout({ name: 'random' }).run();
}

export function layoutRandom(){ cy.layout({name:'random'}).run(); }
export function layoutCircle(){ cy.layout({name:'circle', fit:true, padding:40}).run(); }
export function layoutCenterOnSelection(){
  const sel = cy.$('node:selected'); if (!sel.length) return;
  const center = sel[0].position(), neighbors = sel[0].connectedEdges().connectedNodes().difference(sel);
  const N = neighbors.length, R = 180;
  neighbors.positions((i)=>({ x:center.x+Math.cos(2*Math.PI*i/Math.max(N,1))*R,
                              y:center.y+Math.sin(2*Math.PI*i/Math.max(N,1))*R }));
  cy.center(sel[0]);
}

export function addNodeToGraph({id, name, image, nodeColor=null, textColor=null}){
  cy.add({ group:'nodes', data:{ id, name, image, nodeColor, textColor } });
}
export function addEdgeToGraph({from, to, label, strength, type, mutual, edgeColor=null, textColor=null}){
  const id = 'e' + (cy.edges().length + 1);
  cy.add({ group:'edges',
           data:{ id, source:from, target:to, label, strength, type, mutual, edgeColor, textColor },
           classes: mutual ? 'mutual' : '' });
}

export function deleteSelection(){
  const sel = cy.$(':selected'); if (!sel.length) return;
  const nodes = sel.nodes(); const edges = sel.edges();
  nodes.forEach(n => { removeCharacterById(n.id()); });
  edges.forEach(e => {
    const s = e.data('source'), t = e.data('target'), lbl = e.data('label');
    removeRelationPredicate(r => (r.from===s && r.to===t && r.label===lbl));
  });
  cy.remove(sel);
}

// ---- style functions (data優先の色) ----
function nodeBgColor(ele){
  return ele.data('nodeColor') || '#f3f4f6';
}
function nodeTextColor(ele){
  return ele.data('textColor') || '#111827';
}
function edgeLineColor(ele){
  return ele.data('edgeColor') || (COLOR_BY_TYPE[ele.data('type')] || '#6b7280');
}
function edgeTextColor(ele){
  return ele.data('textColor') || '#111827';
}

// 編集適用用：選択中ノード/エッジの data を差し替える
export function patchSelectedNodeData(patch){
  const sel = cy.$('node:selected'); if (!sel.length) return;
  const n = sel[0];
  n.data({ ...n.data(), ...patch });
}
export function patchSelectedEdgeData(patch){
  const sel = cy.$('edge:selected'); if (!sel.length) return;
  const e = sel[0];
  e.data({ ...e.data(), ...patch });
}

import { GRID, COLOR_BY_TYPE, state, removeCharacterById, removeRelationPredicate } from './state.js';

let cy;

export function bootCytoscape(){
  const nodes = state.characters.map(c => ({
    data: { id: String(c.id ?? c.name), name: c.name ?? String(c.id ?? ""), image: c.image ?? null },
    position: (c.x!=null && c.y!=null) ? {x:c.x, y:c.y} : undefined
  }));
  const edges = state.relations.map((r,i)=>({
    data: { id:'e'+i, source:String(r.from), target:String(r.to),
            label:r.label??'', strength:Number(r.strength??3), type:r.type??'', mutual:!!r.mutual },
    classes: r.mutual ? 'mutual' : ''
  }));

  cy = cytoscape({
    container: document.getElementById('graph'),
    elements: { nodes, edges },
    layout: { name: 'random' },
    wheelSensitivity: .2,
    style: [
      { selector:'node', style:{
        'shape':'round-rectangle','width':100,'height':120,
        'background-color':'#f3f4f6','background-image':'data(image)','background-fit':'cover',
        'border-color':'#9ca3af','border-width':2,
        'label':'data(name)','text-wrap':'wrap','text-valign':'bottom','text-halign':'center',
        'text-background-opacity':.7,'text-background-color':'#fff','text-margin-y':8,'font-size':12
      }},
      { selector:'edge', style:{
        'curve-style':'bezier','line-color': edgeColorByType,'target-arrow-color': edgeColorByType,
        'width':'mapData(strength,1,5,2,8)','label':'data(label)','font-size':11,
        'text-background-opacity':.8,'text-background-color':'#fff','text-background-padding':2,
        'target-arrow-shape':'triangle'
      }},
      { selector:'edge.mutual', style:{ 'source-arrow-shape':'triangle','source-arrow-color': edgeColorByType }},
      { selector:'node:selected', style:{ 'border-color':'#2563eb','border-width':3 }},
      { selector:'edge:selected', style:{ 'line-color':'#2563eb','target-arrow-color':'#2563eb','source-arrow-color':'#2563eb' }}
    ]
  });

  // グリッドスナップ
  cy.on('free','node', e=>{
    if (!document.getElementById('chk-snap').checked) return;
    const n = e.target, p = n.position();
    n.position({ x: Math.round(p.x/GRID)*GRID, y: Math.round(p.y/GRID)*GRID });
    // stateへ保存
    const id = n.id();
    const i = state.characters.findIndex(c => String(c.id ?? c.name) === id);
    if (i >= 0){ state.characters[i].x = n.position().x; state.characters[i].y = n.position().y; }
  });

  return cy;
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

export function addNodeToGraph({id, name, image}){
  cy.add({ group:'nodes', data:{ id, name, image } });
}

export function addEdgeToGraph({from, to, label, strength, type, mutual}){
  const id = 'e' + (cy.edges().length + 1);
  cy.add({ group:'edges', data:{ id, source:from, target:to, label, strength, type, mutual },
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

function edgeColorByType(ele){ const t = ele.data('type'); return COLOR_BY_TYPE[t] || '#6b7280'; }

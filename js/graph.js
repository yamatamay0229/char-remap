import { GRID, COLOR_BY_TYPE, state, removeCharacterById, removeRelationPredicate, settings } from './state.js';

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
  const raw = ele.data('nodeColor') || '#f3f4f6';
  return settings.autoContrast ? adjustContrastNear(raw, settings.backgroundColor, 1.5) : raw;
}
function nodeTextColor(ele){
  const raw = ele.data('textColor') || '#111827';
  const bg  = nodeBgColor(ele); // ノード文字はノード背景と比較
  return settings.autoContrast ? adjustContrastNear(raw, bg, 3) : raw;
}
function edgeLineColor(ele){
  const raw = ele.data('edgeColor') || (COLOR_BY_TYPE[ele.data('type')] || '#6b7280');
  return settings.autoContrast ? adjustContrastNear(raw, settings.backgroundColor, 3) : raw;
}
function edgeTextColor(ele){
  const raw = ele.data('textColor') || '#111827';
  // ラベルは白地（text-background-color:#fff）上に描かれる想定
  return settings.autoContrast ? adjustContrastNear(raw, '#ffffff', 3) : raw;
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

// ---------- Color utils: keep hue/sat, minimally adjust lightness to meet contrast ----------
function hexToRgb(h){
  if (!h) return null;
  const s = h.trim().replace(/^#/, '');
  if (![3,6].includes(s.length)) return null;
  const n = s.length === 3 ? s.split('').map(x=>x+x).join('') : s;
  return { r: parseInt(n.slice(0,2),16), g: parseInt(n.slice(2,4),16), b: parseInt(n.slice(4,6),16) };
}
function rgbToHex({r,g,b}){
  const to = v => v.toString(16).padStart(2,'0');
  return `#${to(Math.round(r))}${to(Math.round(g))}${to(Math.round(b))}`;
}
function rgbToHsl({r,g,b}){
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h, s, l=(max+min)/2;
  if (max===min){ h=s=0; }
  else {
    const d=max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h=(g-b)/d+(g<b?6:0); break;
      case g: h=(b-r)/d+2; break;
      case b: h=(r-g)/d+4; break;
    }
    h/=6;
  }
  return {h,s,l};
}
function hslToRgb({h,s,l}){
  if (s===0){
    const v=l*255; return {r:v,g:v,b:v};
  }
  const hue2rgb=(p,q,t)=>{
    if(t<0) t+=1; if(t>1) t-=1;
    if(t<1/6) return p+(q-p)*6*t;
    if(t<1/2) return q;
    if(t<2/3) return p+(q-p)*(2/3 - t)*6;
    return p;
  };
  const q = l<0.5 ? l*(1+s) : l+s-l*s;
  const p = 2*l - q;
  const r = hue2rgb(p,q,h+1/3);
  const g = hue2rgb(p,q,h);
  const b = hue2rgb(p,q,h-1/3);
  return { r:r*255, g:g*255, b:b*255 };
}
function relLuminance({r,g,b}){
  const s = [r,g,b].map(v=>v/255).map(v => v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
  return 0.2126*s[0] + 0.7152*s[1] + 0.0722*s[2];
}
function contrastRatio(hex1, hex2){
  const c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
  if (!c1 || !c2) return 1;
  const L1 = relLuminance(c1), L2 = relLuminance(c2);
  const [a,b] = L1 >= L2 ? [L1,L2] : [L2,L1];
  return (a + 0.05) / (b + 0.05);
}

/**
 * 指定色hexを基準に、背景bgに対して minコントラスト を満たすよう
 * 明度(L)のみ最小移動で調整。H/Sは維持。
 * @returns 調整後のhex
 */
function adjustContrastNear(hex, bg, min=3){
  if (!hex) return null;
  const origRgb = hexToRgb(hex), bgRgb = hexToRgb(bg);
  if (!origRgb || !bgRgb) return hex;
  if (contrastRatio(hex, bg) >= min) return hex;

  const hsl = rgbToHsl(origRgb);

  // 明るくする方向： [Lorig, 1] で最小上方解（hi）を探す
  const tryBrighten = ()=>{
    let lo = hsl.l, hi = 1;
    for (let i=0;i<18;i++){
      const mid = (lo+hi)/2;
      const test = rgbToHex(hslToRgb({h:hsl.h, s:hsl.s, l:mid}));
      if (contrastRatio(test, bg) >= min) hi = mid; else lo = mid;
    }
    const out = rgbToHex(hslToRgb({h:hsl.h, s:hsl.s, l:hi}));
    return { hex: out, delta: Math.abs(hi - hsl.l), ok: contrastRatio(out, bg) >= min };
  };

  // 暗くする方向： [0, Lorig] で最大下方解（hi）を探す
  const tryDarken = ()=>{
    let lo = 0, hi = hsl.l;
    for (let i=0;i<18;i++){
      const mid = (lo+hi)/2;
      const test = rgbToHex(hslToRgb({h:hsl.h, s:hsl.s, l:mid}));
      if (contrastRatio(test, bg) >= min) hi = mid; else lo = mid;
    }
    const out = rgbToHex(hslToRgb({h:hsl.h, s:hsl.s, l:hi}));
    return { hex: out, delta: Math.abs(hi - hsl.l), ok: contrastRatio(out, bg) >= min };
  };

  const up = tryBrighten();
  const down = tryDarken();

  if (up.ok && down.ok) return up.delta <= down.delta ? up.hex : down.hex;
  if (up.ok) return up.hex;
  if (down.ok) return down.hex;

  // どちらも満たせない場合は「近い方」
  return up.hex;//up.delta <= down.delta ? up.hex : down.hex;
}

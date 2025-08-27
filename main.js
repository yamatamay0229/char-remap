// ====== 設定 ======
const GRID = 50; // グリッド間隔（px）
const COLOR_BY_TYPE = {
  "感情": "#ef4444",
  "家族": "#3b82f6",
  "敵対": "#111827",
  "組織": "#10b981"
};

// ====== データ読み込み → 初期化 ======
(async function init() {
  const [chars, rels] = await Promise.all([
    fetch('./data/characters.json').then(r => r.json()),
    fetch('./data/relations.json').then(r => r.json())
  ]);

  // characters.json 例想定:
  // [{ "id":"altina","name":"アルティナ","image":"./images/altina.png" }, ...]
  const nodes = (chars || []).map(c => ({
    data: {
      id: String(c.id ?? c.name),
      name: c.name ?? String(c.id ?? ""),
      image: c.image ?? null
    },
    position: c.x && c.y ? { x: c.x, y: c.y } : undefined
  }));

  // relations.json 例想定:
  // [{ "from":"altina","to":"uruu","label":"保護","strength":5,"mutual":true,"type":"感情" }, ...]
  const edges = (rels || []).map((r, i) => ({
    data: {
      id: `e${i}`,
      source: String(r.from),
      target: String(r.to),
      label: r.label ?? "",
      strength: Number(r.strength ?? 3),
      type: r.type ?? "",
      mutual: !!r.mutual
    },
    classes: r.mutual ? 'mutual' : ''
  }));

  bootCytoscape(nodes, edges);
})();

// ====== Cytoscape 初期化 ======
let cy;
function bootCytoscape(nodes, edges) {
  cy = cytoscape({
    container: document.getElementById('graph'),
    elements: { nodes, edges },
    layout: { name: 'random' },
    wheelSensitivity: 0.2,
    style: [
      // ノード基本
      {
        selector: 'node',
        style: {
          'shape': 'round-rectangle',
          'width': 100, 'height': 120,
          'background-color': '#f3f4f6',
          'background-image': 'data(image)',
          'background-fit': 'cover',
          'border-color': '#9ca3af',
          'border-width': 2,
          'label': 'data(name)',
          'text-wrap': 'wrap',
          'text-valign': 'bottom',
          'text-halign': 'center',
          'text-justification': 'center',
          'text-background-opacity': 0.7,
          'text-background-color': '#ffffff',
          'text-margin-y': 8,
          'font-size': 12
        }
      },
      // エッジ
      {
        selector: 'edge',
        style: {
          'curve-style': 'bezier',
          'line-color': edgeColorByType,
          'target-arrow-color': edgeColorByType,
          'width': 'mapData(strength, 1, 5, 2, 8)',
          'label': 'data(label)',
          'font-size': 11,
          'text-background-opacity': 0.8,
          'text-background-color': '#fff',
          'text-background-padding': 2,
          'target-arrow-shape': 'triangle'
        }
      },
      // 相互（両矢印）
      {
        selector: 'edge.mutual',
        style: {
          'source-arrow-shape': 'triangle',
          'source-arrow-color': edgeColorByType
        }
      },
      // 選択強調
      { selector: 'node:selected', style: { 'border-color': '#2563eb', 'border-width': 3 } },
      { selector: 'edge:selected', style: { 'line-color': '#2563eb', 'target-arrow-color': '#2563eb', 'source-arrow-color': '#2563eb' } }
    ]
  });

  // 疑似グリッドスナップ：ドラッグ終了時に座標を丸める
  cy.on('free', 'node', (evt) => {
    if (!document.getElementById('chk-snap').checked) return;
    const n = evt.target;
    const p = n.position();
    n.position({
      x: Math.round(p.x / GRID) * GRID,
      y: Math.round(p.y / GRID) * GRID
    });
  });

  // レイアウトボタン
  document.getElementById('btn-random').onclick = () =>
    cy.layout({ name: 'random' }).run();

  document.getElementById('btn-circle').onclick = () =>
    cy.layout({ name: 'circle', fit: true, padding: 40 }).run();

  document.getElementById('btn-center').onclick = () => {
    const sel = cy.$('node:selected');
    if (sel.length === 0) return;
    const center = sel[0].position();
    // 選択ノードを中心、距離は強さでなんとなく分散
    const neighbors = sel[0].connectedEdges().connectedNodes().difference(sel);
    const N = neighbors.length;
    const R = 180;
    neighbors.positions((i, ele) => ({
      x: center.x + Math.cos((2 * Math.PI * i) / Math.max(N, 1)) * R,
      y: center.y + Math.sin((2 * Math.PI * i) / Math.max(N, 1)) * R
    }));
    cy.center(sel[0]);
  };
}

// エッジ色を type に応じて決める関数
function edgeColorByType(ele) {
  const t = ele.data('type');
  return COLOR_BY_TYPE[t] || '#6b7280';
}

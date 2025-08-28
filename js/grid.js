// grid.js: グリッドCanvasの描画管理（唯一の窓口）

let canvas, ctx, container, visible = true;
let need = true, raf = null;
let getCy = null; // Cytoscapeのzoom/pan参照用コールバックを後で注入

/**
 * [API] 初期化。なぜ：Canvas生成とリサイズ監視を一箇所に集約。
 */
export function init(containerEl, opts = {}){
  container = containerEl;
  canvas = document.getElementById('grid-canvas');
  ctx = canvas.getContext('2d');
  getCy = opts.getCy || null;

  // リサイズ監視（非表示ならフラグだけ立てる）
  new ResizeObserver(() => { visible ? redraw() : need = true; }).observe(container);

  // テーマ変更→即再描画（CSS変数の線色が変わる）
  document.addEventListener('app:themechanged', () => requestAnimationFrame(redraw));

  redraw(); // 初回
}

/**
 * [API] 可視切替。なぜ：OFF中の変更をON時に必ず反映。
 */
export function setVisible(show){
  visible = !!show;
  canvas.style.display = visible ? 'block' : 'none';
  if (visible) redraw(); // display:none→block の瞬間に再描画
}

/**
 * [API] 不透明度。なぜ：線の強弱を好みで調整。
 */
export function setOpacity(alpha){
  const v = Math.max(0, Math.min(1, Number(alpha)||0));
  canvas.style.opacity = String(v);
}

/**
 * [API] 即時再描画。なぜ：テーマ切替やON直後の1回を保証。
 */
export function redraw(){
  if (!container) return;
  need = false;
  resizeCanvas();  // [INT] 正しいピクセルサイズの確保
  drawGrid();      // [INT] 実際に線を描く
}

/**
 * [API] 間引き再描画。なぜ：viewport高頻度イベントで描きすぎない。
 */
export function scheduleRedraw(){
  need = true;
  if (!visible || raf) return;
  raf = requestAnimationFrame(() => { raf = null; if (need) redraw(); });
}

/** [INT] コンテナサイズに合わせて実ピクセルでリサイズ。 */
function resizeCanvas(){
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width  = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  canvas.width  = Math.round(rect.width  * dpr);
  canvas.height = Math.round(rect.height * dpr);
  // 変換は drawGrid で設定
}

/** [INT] GRIDの世界座標でグリッドを描く（zoom/panと完全一致） */
function drawGrid(){
  const rect = container.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  const dpr = window.devicePixelRatio || 1;

  // 背景クリア
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // Cytoscape の zoom/pan を取得（注入式）
  const cy = getCy ? getCy() : null;
  if (!cy) return;

  const z = cy.zoom();
  const pan = cy.pan();

  // Cytoscapeと同じ変換を適用
  ctx.setTransform(dpr*z, 0, 0, dpr*z, dpr*pan.x, dpr*pan.y);

  // CSS変数から色を取得（テーマで輝度が変わる）
  const cs = getComputedStyle(document.documentElement);
  const minor = cs.getPropertyValue('--grid-minor').trim() || 'rgba(0,0,0,.10)';
  const major = cs.getPropertyValue('--grid-major').trim() || 'rgba(0,0,0,.25)';

  // 画面内の世界座標範囲
  const left   = -pan.x / z;
  const top    = -pan.y / z;
  const right  = left + w / z;
  const bottom = top  + h / z;

  // ステップ
  const GRID = 50; // ← 当面ここを使う。後で settings.gridSize に寄せ替えOK
  const step1 = GRID;
  const step5 = GRID * 5;

  // 端をスナップ
  const sx1 = Math.floor(left  / step1) * step1;
  const ex1 = Math.ceil (right / step1) * step1;
  const sy1 = Math.floor(top   / step1) * step1;
  const ey1 = Math.ceil (bottom/ step1) * step1;

  // 線幅はズームに反比例（見た目1px前後）
  ctx.lineWidth = 1 / z;

  // 細グリッド
  ctx.strokeStyle = minor;
  ctx.beginPath();
  for (let x = sx1; x <= ex1; x += step1) { ctx.moveTo(x, top); ctx.lineTo(x, bottom); }
  for (let y = sy1; y <= ey1; y += step1) { ctx.moveTo(left, y); ctx.lineTo(right, y); }
  ctx.stroke();

  // 主グリッド（5マス）
  const sx5 = Math.floor(sx1 / step5) * step5;
  const sy5 = Math.floor(sy1 / step5) * step5;
  ctx.strokeStyle = major;
  ctx.beginPath();
  for (let x = sx5; x <= ex1; x += step5) { ctx.moveTo(x, top); ctx.lineTo(x, bottom); }
  for (let y = sy5; y <= ey1; y += step5) { ctx.moveTo(left, y); ctx.lineTo(right, y); }
  ctx.stroke();
}

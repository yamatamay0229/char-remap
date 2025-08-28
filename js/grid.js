// grid.js — グリッドCanvasの描画管理（唯一の窓口）
import { settings } from './settings.js';

let canvas, ctx, container, visible = true;
let need = true, raf = null;
let getCy = null; // Cytoscapeの zoom/pan を取る getter（main から注入）

/** [API] 初期化：Canvas準備 + リサイズ監視 + テーマイベント購読。 */
export function init(containerEl, opts = {}){
  container = containerEl;
  canvas = document.getElementById('grid-canvas');
  ctx = canvas.getContext('2d');
  getCy = opts.getCy || null;

  new ResizeObserver(() => { visible ? redraw() : need = true; }).observe(container); // サイズ変化
  document.addEventListener('app:themechanged', () => requestAnimationFrame(redraw)); // テーマ切替
  setOpacity(settings.gridOpacity); // 初期不透明度
  redraw(); // 初回
}

/** [API] 可視切替：OFF中の変更はON時に必ず反映。 */
export function setVisible(show){
  visible = !!show;
  canvas.style.display = visible ? 'block' : 'none';
  if (visible) redraw(); // display:none→block の瞬間にリサイズ→描画
}

/** [API] 不透明度：線の強弱を好みで調整。 */
export function setOpacity(alpha){
  const v = Math.max(0, Math.min(1, Number(alpha) || 0));
  canvas.style.opacity = String(v);
}

/** [API] 即時再描画：テーマ切替/表示直後などに1回確実に描く。 */
export function redraw(){
  if (!container) return;
  need = false;
  resizeCanvas();
  drawGrid();
}

/** [API] 間引き再描画：viewport等の高頻度イベントで使う。 */
export function scheduleRedraw(){
  need = true;
  if (!visible || raf) return;
  raf = requestAnimationFrame(() => { raf = null; if (need) redraw(); });
}

/** [INT] 実ピクセルで Canvas をリサイズ。 */
function resizeCanvas(){
  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width  = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  canvas.width  = Math.round(rect.width  * dpr);
  canvas.height = Math.round(rect.height * dpr);
}

/** [INT] グリッドを“世界座標（GRID）”で描く：Cytoscape の zoom/pan に完全一致。 */
function drawGrid(){
  const rect = container.getBoundingClientRect();
  const w = rect.width, h = rect.height;
  const dpr = window.devicePixelRatio || 1;

  // 背景クリア
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,canvas.width,canvas.height);

  const cy = getCy ? getCy() : null;
  if (!cy) return;

  const z = cy.zoom();
  const pan = cy.pan();

  // Cytoscape と同じ変換を適用（拡縮軸を一致させる）
  ctx.setTransform(dpr*z, 0, 0, dpr*z, dpr*pan.x, dpr*pan.y);

  // テーマ由来の線色（輝度）は CSS 変数から
  const cs = getComputedStyle(document.documentElement);
  const minor = cs.getPropertyValue('--grid-minor').trim() || 'rgba(0,0,0,.10)';
  const major = cs.getPropertyValue('--grid-major').trim() || 'rgba(0,0,0,.25)';

  // 画面内の世界座標範囲
  const left   = -pan.x / z;
  const top    = -pan.y / z;
  const right  = left + w / z;
  const bottom = top  + h / z;

  // ステップ（settings.gridSize を採用）
  const step1 = settings.gridSize;
  const step5 = step1 * 5;

  // 端をスナップ
  const sx1 = Math.floor(left  / step1) * step1;
  const ex1 = Math.ceil (right / step1) * step1;
  const sy1 = Math.floor(top   / step1) * step1;
  const ey1 = Math.ceil (bottom/ step1) * step1;

  ctx.lineWidth = 1 / z; // 見た目1px前後を維持

  // 細
  ctx.strokeStyle = minor; ctx.beginPath();
  for (let x = sx1; x <= ex1; x += step1) { ctx.moveTo(x, top); ctx.lineTo(x, bottom); }
  for (let y = sy1; y <= ey1; y += step1) { ctx.moveTo(left, y); ctx.lineTo(right, y); }
  ctx.stroke();

  // 太（5マス）
  const sx5 = Math.floor(sx1 / step5) * step5;
  const sy5 = Math.floor(sy1 / step5) * step5;
  ctx.strokeStyle = major; ctx.beginPath();
  for (let x = sx5; x <= ex1; x += step5) { ctx.moveTo(x, top); ctx.lineTo(x, bottom); }
  for (let y = sy5; y <= ey1; y += step5) { ctx.moveTo(left, y); ctx.lineTo(right, y); }
  ctx.stroke();
}

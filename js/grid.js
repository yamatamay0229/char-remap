// グリッドCanvas（No-Op安全実装）

import { settings } from './settings.js';

let ctx = null, canvas = null, containerEl = null, getCy = () => null, visible = true, opacity = 0.25;

export function init(container, opts){
  containerEl = container;                 // 親を保持
  getCy = (opts && opts.getCy) || (()=>null);
  canvas = document.getElementById('grid-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  resize();
  redraw();
  window.addEventListener('resize', () => { resize(); redraw(); });
}

function resize(){
  if (!canvas || !containerEl) return;
  const rect = containerEl.getBoundingClientRect();       // コンテナ基準でサイズ決定
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  if (ctx) ctx.setTransform(dpr,0,0,dpr,0,0);
}

export function setVisible(v){ visible = !!v; redraw(); }
export function setOpacity(a){ opacity = Math.max(0, Math.min(1, Number(a)||0)); redraw(); }
export function scheduleRedraw(){ requestAnimationFrame(redraw); }

export function redraw(){
  if (!ctx || !canvas) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (!visible) return;

  const cy = getCy?.();
  const z = cy?.zoom() ?? 1;
  const pan = cy?.pan() ?? {x:0,y:0};
  const stepWorld = (window.settings?.gridSize) || 50; // settings.js の値でもOK
  const stepScreen = stepWorld * z;

  ctx.globalAlpha = opacity;

  // 画面に見える最初の線の位置（world座標 k*step → screen: k*step*z + pan）
  const startKx = Math.floor((-pan.x) / stepScreen);
  const startKy = Math.floor((-pan.y) / stepScreen);

  // 副グリッド（細線）
  ctx.strokeStyle = 'rgba(128,128,128,0.5)';
  ctx.lineWidth = 1;
  for (let xk = startKx, x = xk*stepScreen + pan.x; x <= canvas.width; xk++, x += stepScreen) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let yk = startKy, y = yk*stepScreen + pan.y; y <= canvas.height; yk++, y += stepScreen) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // 主グリッド（5マスごとに太線）
  ctx.strokeStyle = 'rgba(128,128,128,0.9)';
  ctx.lineWidth = 2;
  for (let xk = startKx, x = xk*stepScreen + pan.x; x <= canvas.width; xk++, x += stepScreen) {
    if (xk % 5 !== 0) continue;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let yk = startKy, y = yk*stepScreen + pan.y; y <= canvas.height; yk++, y += stepScreen) {
    if (yk % 5 !== 0) continue;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

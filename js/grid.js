// グリッドCanvas（No-Op安全実装）

import { settings } from './settings.js';

let ctx = null, canvas = null, getCy = () => null, visible = true, opacity = 0.25;

export function init(container, opts){
  getCy = (opts && opts.getCy) || (()=>null);
  canvas = document.getElementById('grid-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  resize();
  redraw();
  window.addEventListener('resize', () => { resize(); redraw(); });
}

function resize(){
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * devicePixelRatio));
  canvas.height = Math.max(1, Math.floor(rect.height * devicePixelRatio));
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  if (ctx) ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
}

export function setVisible(v){ visible = !!v; redraw(); }
export function setOpacity(a){ opacity = Math.max(0, Math.min(1, Number(a)||0)); redraw(); }
export function scheduleRedraw(){ requestAnimationFrame(redraw); }

export function redraw(){
  if (!ctx || !canvas) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if (!visible) return;

  // ざっくり描画（後で拡張）
  const size = settings.gridSize || 50;
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = 'rgba(128,128,128,0.6)';
  ctx.lineWidth = 1;

  for (let x=0; x<canvas.width; x+=size) {
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
  }
  for (let y=0; y<canvas.height; y+=size) {
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

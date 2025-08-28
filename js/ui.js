// ui.js — ボタンや入力を各モジュールAPIに接続する“配線役”
import { settings, setSetting, applyTheme } from './settings.js';
import * as grid from './grid.js';

/** [API] すべてのUIイベントをここで配線（入口を一本化） */
export function wireUI(cy){
  // グリッド表示（スナップ）切替
  const snapChk = document.getElementById('chk-snap');
  if (snapChk){
    snapChk.checked = !!settings.snap;
    snapChk.addEventListener('change', () => {
      setSetting('snap', snapChk.checked);            // 設定の保存
      grid.setVisible(snapChk.checked);               // 可視切替（ONで必ず再描画）
    });
  }

  // グリッド不透明度
  const opSlider = document.getElementById('grid-opacity');
  const opNumber = document.getElementById('grid-opacity-num');
  const syncOpacity = (v) => { grid.setOpacity(v); if(opSlider) opSlider.value=v; if(opNumber) opNumber.value=v; };
  if (opSlider) opSlider.addEventListener('input', e => syncOpacity(String(e.target.value)));
  if (opNumber) opNumber.addEventListener('input', e => syncOpacity(String(e.target.value)));
  syncOpacity(String(settings.gridOpacity ?? 0.25));  // 初期反映

  // テーマ切替
  const btnTheme = document.getElementById('btn-theme');
  if (btnTheme){
    btnTheme.onclick = () => {
      setSetting('theme', settings.theme==='dark' ? 'light' : 'dark'); // 設定更新
      applyTheme();                                   // CSS変数切替 → grid はイベントで再描画
    };
  }
}

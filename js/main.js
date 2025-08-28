// main.js — 起動の順序だけを管理（他は書かない）
import { applyTheme } from './settings.js';          // テーマ適用（CSS変数反映）
import * as grid from './grid.js';                   // グリッドCanvasの管理
import { bootCytoscape } from './graph.js';          // グラフ本体の起動
import { wireUI } from './ui.js';                    // UIと機能の配線

applyTheme();                                        // 初期テーマ反映

const container = document.getElementById('graph');  // Cytoscapeのコンテナ
let cy = null;

// grid.init: グリッドの初期化。cyインスタンスは後から入るので getter で遅延参照
grid.init(container, { getCy: () => cy });           // [API] グリッドを使える状態にする

cy = bootCytoscape();                                 // [HOOK] グラフ本体を起動
wireUI(cy);                                           // [API] UIイベントをまとめて配線

// main.js — 起動の順序とUIの受け口
import { applyTheme, settings, setSetting } from './settings.js';
import * as grid from './grid.js';
import { bootCytoscape } from './graph.js';
import { wireUI } from './ui.js';              // 既存（必要なら残す）
import { renderMenubar } from './ui/menubar.js';
import { renderSidebar, showEmpty, showNodeDetail, showEdgeDetail } from './ui/sidebar.js';
import { state, updateCharacter, removeCharacterById, updateRelation, removeRelationById } from './state.js';

applyTheme();

const container = document.getElementById('graph');
let cy = null;

// UIフレームを先に作る
renderMenubar(document.getElementById('menubar'), { gridVisible: settings.snap });
renderSidebar(document.getElementById('sidebar'));

grid.init(container, { getCy: () => cy });
cy = bootCytoscape();
wireUI?.(cy); // 既存の配線があればそのまま

// === Graphの選択をサイドバーへ反映 ===
cy.on('select unselect', (evt) => {
  const sels = cy.$(':selected');
  if (sels.length === 0) { showEmpty(); return; }
  const ele = sels[0];
  if (ele.isNode()) {
    showNodeDetail(ele.data());
  } else {
    showEdgeDetail(ele.data());
  }
});

// === メニューからのコマンドを受けて実行 ===
document.addEventListener('app:command', (e) => {
  const { name, value, id, patch } = e.detail || {};
  switch (name) {
    case 'newCharacter':
      // TODO: ダイアログで入力 → ここでは仮追加
      console.log('[newCharacter] 未実装');
      break;
    case 'newRelation':
      console.log('[newRelation] 未実装');
      break;

    case 'undo':
    case 'redo':
      console.log(`[${name}] 未実装（commands.js で対応予定）`);
      break;

    case 'saveJson':
      console.log('[saveJson] 未実装（io.js で対応予定）');
      break;
    case 'loadJson':
      console.log('[loadJson] 未実装（io.js で対応予定）');
      break;

    case 'gridVisible':
      setSetting('snap', !!value);
      grid.setVisible(!!value);
      break;

    case 'toggleTheme':
      setSetting('theme', settings.theme === 'dark' ? 'light' : 'dark');
      applyTheme();  // grid は app:themechanged を拾って再描画
      break;

    case 'updateCharacter':
      updateCharacter(id, patch);
      // 画面反映（選択中ノードのdata更新）
      const n = cy.$id(String(id));
      if (n) n.data({ ...n.data(), ...patch });
      break;

    case 'removeCharacter':
      removeCharacterById(id);
      cy.$id(String(id)).remove();
      showEmpty();
      break;

    case 'updateRelation':
      updateRelation(id, patch);
      const eedge = cy.$id(String(id));
      if (eedge) eedge.data({ ...eedge.data(), ...patch });
      break;

    case 'removeRelation':
      removeRelationById(id);
      cy.$id(String(id)).remove();
      showEmpty();
      break;

    default:
      console.log('[unknown command]', name, e.detail);
  }
});

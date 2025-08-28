// main.js — 起動の順序とUIの受け口
import { applyTheme, settings, setSetting } from './settings.js';
import * as grid from './grid.js';
import { bootCytoscape } from './graph.js';
import { wireUI } from './ui.js';
import { renderMenubar } from './ui/menubar.js';
import { renderSidebar, showEmpty, showNodeDetail, showEdgeDetail } from './ui/sidebar.js';
import {
  state, addCharacter, updateCharacter, removeCharacterById,
  addRelation, updateRelation, removeRelationById
} from './state.js';

applyTheme();

const container = document.getElementById('graph');
let cy = null;

// UIフレーム
renderMenubar(
  document.getElementById('menubar'),
  { gridVisible: settings.snap, gridOpacity: settings.gridOpacity }
);
renderSidebar(document.getElementById('sidebar'));

grid.init(container, { getCy: () => cy });
grid.setOpacity(settings.gridOpacity); // 初期反映
cy = bootCytoscape();
wireUI?.(cy);

// === Graphの選択をサイドバーへ反映 ===
cy.on('select unselect', () => {
  const sels = cy.$(':selected');
  if (sels.length === 0) { showEmpty(); return; }
  const ele = sels[0];
  if (ele.isNode()) showNodeDetail(ele.data());
  else showEdgeDetail(ele.data());
});

// === 画面中央のモデル座標を返す（新規ノード配置用） ===
function getViewportCenterModel() {
  const w = cy.width(), h = cy.height();
  const z = cy.zoom(), pan = cy.pan();
  return { x: (w / 2 - pan.x) / z, y: (h / 2 - pan.y) / z };
}

// === メニューからのコマンドを受けて実行 ===
document.addEventListener('app:command', (e) => {
  const { name, value, id, patch } = e.detail || {};
  switch (name) {
    // ── 新規追加 ─────────────────────────────
    case 'newCharacter': {
      const nameInput = prompt('人物名を入力してください', '');
      if (!nameInput) break;
      const idInput = prompt('ID（未入力なら自動）', '');
      const cid = (idInput && idInput.trim()) || nameInput.trim();
      const pos = getViewportCenterModel();

      try {
        addCharacter({ id: cid, name: nameInput.trim(), pos });
        // 画面に反映
        cy.add({ group: 'nodes', data: { id: String(cid), label: nameInput.trim() }, position: pos });
        cy.$(':selected').unselect();
        cy.$id(String(cid)).select();
      } catch (err) {
        alert(err.message || '追加に失敗しました');
      }
      break;
    }

    case 'newRelation': {
      // 1) まずは選択ノード2つを優先
      const selectedNodes = cy.$('node:selected');
      let fromId, toId;
      if (selectedNodes.length >= 2) {
        fromId = selectedNodes[0].id();
        toId   = selectedNodes[1].id();
      } else {
        // 2) 無ければ手入力
        fromId = prompt('関係の from（ID）を入力', '');
        toId   = prompt('関係の to（ID）を入力', '');
      }
      if (!fromId || !toId) break;
      const label = prompt('関係ラベル（任意）', '') || '';
      const strength = Number(prompt('強さ（1-8, 未入力=3）', '3') || '3');
      try {
        const rid = addRelation({ from: String(fromId), to: String(toId), label, strength });
        // 画面に反映
        cy.add({ group: 'edges', data: { id: String(rid), source: String(fromId), target: String(toId), label, strength } });
        cy.$(':selected').unselect();
        cy.$id(String(rid)).select();
      } catch (err) {
        alert(err.message || '追加に失敗しました');
      }
      break;
    }

    // ── 保存/読み込み/Undo/Redo（ダミー） ────────────
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

    // ── グリッド表示 & 不透明度 ───────────────────
    case 'gridVisible':
      setSetting('snap', !!value);
      grid.setVisible(!!value);
      break;
    case 'gridOpacity':
      if (typeof value === 'number' && !Number.isNaN(value)) {
        setSetting('gridOpacity', value);
        grid.setOpacity(value);
      }
      break;

    // ── テーマ切替 ─────────────────────────────
    case 'toggleTheme':
      setSetting('theme', settings.theme === 'dark' ? 'light' : 'dark');
      applyTheme(); // grid は app:themechanged で再描画
      break;

    // ── 既存の更新/削除 ─────────────────────────
    case 'updateCharacter':
      updateCharacter(id, patch);
      { const n = cy.$id(String(id)); if (n) n.data({ ...n.data(), ...patch }); }
      break;

    case 'removeCharacter':
      removeCharacterById(id);
      cy.$id(String(id)).remove();
      showEmpty();
      break;

    case 'updateRelation':
      updateRelation(id, patch);
      { const ed = cy.$id(String(id)); if (ed) ed.data({ ...ed.data(), ...patch }); }
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

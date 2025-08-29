// 司令塔：起動順序・app:command集約・各モジュール橋渡し

import { applyTheme, settings, setSetting } from './settings.js';
import * as grid from './grid.js';
import { addNodeVisual, bootCytoscape, applySheet } from './graph.js';
import { renderMenubar } from './ui/menubar.js';
import { renderSidebar, showEmpty, showNodeDetail, showEdgeDetail } from './ui/sidebar.js';

import {
  getSnapshot, setData,
  addCharacter, updateCharacter, removeCharacterById,
  addRelation, updateRelation, removeRelationById,
  createSheet, renameSheet, deleteSheet
} from './state/index.js';

applyTheme();

const container = document.getElementById('graph');
let cy = null;

// UIを先に描く
renderMenubar(document.getElementById('menubar'), {
  gridVisible: settings.snap,
  gridOpacity: settings.gridOpacity,
  activeSheetId: settings.activeSheetId
});
renderSidebar(document.getElementById('sidebar'));

// グリッド→グラフ起動
grid.init(container, { getCy: () => cy });
grid.setOpacity(settings.gridOpacity);
cy = bootCytoscape();

// 選択→サイドバー
if (cy && cy.on) {
  cy.on('select unselect', () => {
    const sels = cy.$(':selected');
    if (!sels.length) { showEmpty(); return; }
    const el = sels[0];
    el.isNode() ? showNodeDetail(el.data()) : showEdgeDetail(el.data());
  });
}

// app:command 集約
document.addEventListener('app:command', (e) => {
  const { name, ...rest } = e.detail || {};
  try {
    switch (name) {
      // 追加/編集/削除（No-Op前提）
      // app:command の switch に差し替え or 追加
    case 'newCharacter': {
      // 1) stateを更新
      const id = addCharacter({ name: 'New Character' });

      // 2) 画面中央のモデル座標を計算
      const ext = cy.extent(); // 可視範囲（モデル座標）
      const pos = { x: (ext.x1 + ext.x2) / 2, y: (ext.y1 + ext.y2) / 2 };

      // 3) ノードを描画に追加
      addNodeVisual({ id, name: 'New Character', nodeColor: '#cccccc', textColor: '#111111', pos });

      // 4) 追加ノードを選択
      cy.$id(id).select();
      break;
    }
      case 'updateCharacter': /* TODO */ break;
      case 'removeCharacter': /* TODO */ break;

      case 'newRelation': /* TODO */ break;
      case 'updateRelation': /* TODO */ break;
      case 'removeRelation': /* TODO */ break;

      // グリッド/テーマ/サイドバー
      case 'gridVisible': grid.setVisible(!!rest.value); setSetting('snap', !!rest.value); break;
      case 'gridOpacity': grid.setOpacity(Number(rest.value||0)); setSetting('gridOpacity', Number(rest.value||0)); break;
      case 'toggleTheme': setSetting('theme', settings.theme==='dark'?'light':'dark'); applyTheme(); break;
      case 'toggleSidebar': document.body.classList.toggle('sidebar-collapsed'); break;

      // シート
      case 'switchSheet': setSetting('activeSheetId', String(rest.id)); applySheet(String(rest.id)); break;
      case 'createSheet': createSheet(rest.name||'Sheet'); break;
      case 'renameSheet': renameSheet(rest.id, rest.name); break;
      case 'deleteSheet': deleteSheet(rest.id); break;

      // I/O / Undo
      case 'saveJson': /* TODO io.exportJSON() */ break;
      case 'loadJson': /* TODO io.importJSON() */ break;
      case 'undo':
      case 'redo': /* TODO commands */ break;

      default: console.debug('[app:command] noop', name, rest);
    }
  } catch (err) {
    console.warn('[command error]', name, err);
    // TODO: UI通知（トースト等）
  }
});

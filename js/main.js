// 司令塔：起動順序・app:command集約・各モジュール橋渡し

import { applyTheme, settings, setSetting } from './settings.js';
import * as grid from './grid.js';
import { 
  addNodeVisual, updateNodeVisual,
	bootCytoscape, applySheet,
  addEdgeVisual, updateEdgeVisual, removeVisualById
} from './graph.js';
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
    case 'updateCharacter': {
		  const { id, patch } = rest;         // rest は e.detail の残り
  		try {
    		// 1) state を更新
    		updateCharacter(id, patch || {});
    		// 2) 見た目を更新（色・ラベルなど）
    		updateNodeVisual(id, patch || {});
  		} catch (e) {
   		 console.warn('[updateCharacter] failed:', e.message || e);
  		}
  		break;
		}

		case 'removeCharacter': {
  		const { id } = rest;
  		try {
    		// 1) state から削除（関係線/シート座標も掃除される想定）
    		removeCharacterById(id);
    		// 2) 画面からノード（と接続エッジ）を削除
    		if (cy) {
      		const node = cy.getElementById(String(id));
      		if (node && !node.empty()) node.remove();
      		// ※ removeVisualById(id) でもOK（ノード/エッジ共通IDに対応している場合）
      		// removeVisualById(id);
    		}
    		// 3) サイドバーを初期表示に戻す
    		showEmpty();
  		} catch (e) {
    		console.warn('[removeCharacter] failed:', e.message || e);
  		}
  		break;
		}

    case 'newRelation': {
      // 明示指定がなければ選択中から拾う
      let { from, to, label, strength, mutual } = rest;
      if (!from || !to) {
        const sels = cy.$('node:selected');
        if (sels.length !== 2) { console.warn('2つの人物を選択してください'); break; }
        from = sels[0].id();
        to   = sels[1].id();
      }
      try{
        const id = addRelation({ from, to, label: label||'', strength: strength??3, mutual: !!mutual, edgeColor:'#888888', textColor:'#ffffff' });
        addEdgeVisual({ id, from, to, label, strength, mutual, edgeColor:'#888888', textColor:'#ffffff' });
        cy.getElementById(id).select();
      }catch(e){
        console.warn('[newRelation] failed:', e.message||e);
      }
      break;
    }

    case 'updateRelation': {
      const { id, patch } = rest;
      try {
        updateRelation(id, patch||{});
        updateEdgeVisual(id, patch||{});
      } catch(e) {
        console.warn('[updateRelation] failed:', e.message||e);
      }
      break;
    }

    case 'removeRelation': {
      const { id } = rest;
      try {
        removeRelationById(id);
        removeVisualById(id);
      } catch(e) {
        console.warn('[removeRelation] failed:', e.message||e);
      }
      break;
    }

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

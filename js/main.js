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
import { execute, undo, redo } from './commands.js';
import {
  /*CmdAddCharacter, CmdUpdateCharacter, CmdRemoveCharacter,
  CmdAddRelation,  CmdUpdateRelation,  CmdRemoveRelation,*/
  EntryAddCharacter, EntryUpdateCharacter, EntryRemoveCharacter,
  EntryAddRelation,  EntryUpdateRelation,  EntryRemoveRelation,
  EntryMoveNode,     EntryApplyLayout
} from './commands.js';

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
  		// 位置は中央に
  		const ext = cy.extent();
  		const pos = { x: (ext.x1 + ext.x2)/2, y: (ext.y1 + ext.y2)/2 };
  		execute(EntryAddCharacter({ name:'New Character', pos }));
  		break;
	}
	case 'updateCharacter': {
  		const { id, patch } = rest;
 		execute(EntryUpdateCharacter(id, patch||{}));
  		break;
	}
	case 'removeCharacter': {
  		const { id } = rest;
  		execute(EntryRemoveCharacter(id));
		showEmpty();
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
      execute(EntryAddRelation({ from, to, label: label||'', strength: strength??3, mutual: !!mutual, edgeColor:'#888888', textColor:'#ffffff' }));
	  break;
	}

    case 'updateRelation': {
	  const { id, patch } = rest;
	  execute(EntryUpdateRelation(id, patch||{}));
	  break;
	}
	case 'removeRelation': {
	  const { id } = rest;
	  execute(EntryRemoveRelation(id));
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
    case 'undo': {
	  undo('sheet', { activeSheetId: settings.activeSheetId || 'default' });
	  break;
	}
	case 'redo': {
	  redo('sheet', { activeSheetId: settings.activeSheetId || 'default' });
	  break;
	}

    default: console.debug('[app:command] noop', name, rest);
  	}
  } catch (err) {
    console.warn('[command error]', name, err);
    // TODO: UI通知（トースト等）
  }
});

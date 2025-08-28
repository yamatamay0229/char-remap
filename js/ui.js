import {
  state, setData, setCharacterTags,
  addCharacter, updateCharacter, addRelation, updateRelation,
  findRelationIndex, GRID, settings
} from './state.js';

import {
  addNodeToGraph, addEdgeToGraph, deleteSelection,
  layoutRandom, layoutCircle, layoutCenterOnSelection,
  reloadGraphFromState, patchSelectedNodeData, patchSelectedEdgeData
} from './graph.js';

export function wireUI(){
  // レイアウト
  document.getElementById('btn-random').onclick = layoutRandom;
  document.getElementById('btn-circle').onclick = layoutCircle;
  document.getElementById('btn-center').onclick = layoutCenterOnSelection;

  // ---- 人物追加ダイアログ ----
  const dlgP = document.getElementById('dlg-person');
  const formP = document.getElementById('form-person');
  const pAttrsBox = document.getElementById('p-attrs');

  function renderAttrInputs(container, values={}){
    container.innerHTML = '';
    state.characterTags.forEach(key=>{
      const id = `attr-${key}`;
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `<label for="${id}">${escapeHtml(key)}</label>
                       <input id="${id}" name="${key}" type="text" value="${escapeHtml(values[key]||'')}">`;
      container.appendChild(row);
    });
  }

  document.getElementById('btn-add-person').onclick = () => {
    formP.reset();
    renderAttrInputs(pAttrsBox, {});
    dlgP.showModal();
  };
  document.getElementById('p-cancel').onclick = () => dlgP.close();

  formP.onsubmit = (e)=>{
    e.preventDefault();
    try{
      const id    = document.getElementById('p-id').value.trim();
      const name  = document.getElementById('p-name').value.trim();
      const image = (document.getElementById('p-image').value.trim() || null);
      const nodeColor = (document.getElementById('p-bg').value || null);
      const textColor = (document.getElementById('p-fg').value || null);
      if (!id || !name) return;

      const attrs = {};
      state.characterTags.forEach(k=>{
        const el = document.getElementById(`attr-${k}`);
        attrs[k] = el ? el.value : '';
      });

      addCharacter({ id, name, image, nodeColor, textColor, attrs });
      addNodeToGraph({ id, name, image, nodeColor, textColor });
      dlgP.close();
    }catch(err){ alert(err.message || String(err)); }
  };

  // ---- 関係追加ダイアログ ----
  const dlgR = document.getElementById('dlg-relation');
  const formR = document.getElementById('form-relation');
  const selFrom = document.getElementById('r-from');
  const selTo   = document.getElementById('r-to');

  function refreshPersonSelects(){
    const opts = state.characters
      .map(c => `<option value="${escapeHtml(String(c.id ?? c.name))}">${escapeHtml(c.name)}</option>`).join('');
    selFrom.innerHTML = opts; selTo.innerHTML = opts;
  }

  document.getElementById('btn-add-relation').onclick = () => {
    if (state.characters.length < 2){ alert('人物が2人以上必要です'); return; }
    refreshPersonSelects();
    formR.reset();
    document.getElementById('r-strength').value = 3;
    document.getElementById('r-mutual').value = "false";
    dlgR.showModal();
  };
  document.getElementById('r-cancel').onclick = () => dlgR.close();

  formR.onsubmit = (e)=>{
    e.preventDefault();
    try{
      const from = selFrom.value, to = selTo.value;
      const label = document.getElementById('r-label').value.trim();
      const strength = Math.max(1, Math.min(5, Number(document.getElementById('r-strength').value || 3)));
      const type = document.getElementById('r-type').value.trim();
      const mutual = document.getElementById('r-mutual').value === "true";
      const edgeColor = (document.getElementById('r-line').value || null);
      const textColor = (document.getElementById('r-text').value || null);

      if (from === to){ alert('同一人物同士は選べません'); return; }

      addRelation({ from, to, label, strength, type, mutual, edgeColor, textColor });
      addEdgeToGraph({ from, to, label, strength, type, mutual, edgeColor, textColor });
      dlgR.close();
    }catch(err){ alert(err.message || String(err)); }
  };

const chkAC = document.getElementById('chk-autocontrast');
if (chkAC) {
  chkAC.checked = settings.autoContrast;
  chkAC.addEventListener('change', () => { settings.autoContrast = chkAC.checked; });
}

  // ===== グリッド線オーバーレイ初期化 =====
const gridEl = document.getElementById('grid-overlay');
initGridOverlay(gridEl);

// 既存の「グリッドスナップ」チェックに連動して、グリッド線の表示も切り替え
const snapChk = document.getElementById('chk-snap');
const applyGridVisibility = () => {
  gridEl.style.display = snapChk.checked ? 'block' : 'none';
};
applyGridVisibility();
snapChk.addEventListener('change', applyGridVisibility);

// 不透明度コントロール（スライダー ⇄ 数値）双方向同期
const opSlider = document.getElementById('grid-opacity');
const opNumber = document.getElementById('grid-opacity-num');
const setGridOpacity = (v) => {
  const val = Math.min(1, Math.max(0, Number(v) || 0));
  gridEl.style.opacity = String(val);
  opSlider.value = String(val);
  opNumber.value = String(val);
};
opSlider.addEventListener('input', (e)=> setGridOpacity(e.target.value));
opNumber.addEventListener('input', (e)=> setGridOpacity(e.target.value));

// 初期反映
setGridOpacity(opSlider.value);

// ===== ヘルパ：グリッドの見た目を初期化 =====
function initGridOverlay(el){
  // 背景が明るい/暗いで線色を切替（お好みで固定でもOK）
  const bg = (settings?.backgroundColor ?? '#ffffff').toLowerCase();
  const isLightBg = (() => {
    // 簡易輝度判定
    const m = bg.replace('#','');
    const n = m.length===3 ? m.split('').map(x=>x+x).join('') : m;
    const r = parseInt(n.slice(0,2),16), g = parseInt(n.slice(2,4),16), b = parseInt(n.slice(4,6),16);
    const L = (0.2126*(r/255)**2.2 + 0.7152*(g/255)**2.2 + 0.0722*(b/255)**2.2); // ざっくり
    return L > 0.5;
  })();

  const major = isLightBg ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)'; // 太線（毎マス）
  const minor = isLightBg ? 'rgba(0,0,0,0.10)' : 'rgba(255,255,255,0.10)'; // 細線（補助）

  // 2本の linear-gradient で格子を作る（横と縦）
  /*el.style.backgroundImage =
    `linear-gradient(to right, ${minor} 1px, transparent 1px),
     linear-gradient(to bottom, ${minor} 1px, transparent 1px)`;

  // マス目間隔（GRID px）
  el.style.backgroundSize = `${GRID}px ${GRID}px`;*/

  // 5マスごとに少し濃い「主グリッド」を重ねたい場合は、以下を追加で重ねてもOK
  el.style.backgroundImage =
    `linear-gradient(to right, ${minor} 1px, transparent 1px),
     linear-gradient(to bottom, ${minor} 1px, transparent 1px),
     linear-gradient(to right, ${major} 1px, transparent 1px),
     linear-gradient(to bottom, ${major} 1px, transparent 1px)`;
  //el.style.backgroundSize = `${GRID}px ${GRID}px, ${GRID}px ${GRID}px, ${GRID*5}px ${GRID*5}px, ${GRID*5}px ${GRID*5}px`;
  // サイズと位置は graph.js の syncGrid() が都度上書きします
  el.style.backgroundRepeat = 'repeat';
}

  
  // ---- 削除 ----
  document.getElementById('btn-delete').onclick = deleteSelection;

  // ---- 属性タグ管理 ----
  document.getElementById('btn-attr-tags').onclick = () => {
    const current = state.characterTags.join(', ');
    const input = prompt('属性タグをカンマ区切りで指定してください（例: 性格, 体格, 役割）', current);
    if (input == null) return;
    const tags = input.split(',').map(s => s.trim()).filter(Boolean);
    setCharacterTags(tags);
    // 追加ダイアログの入力UI更新
    renderAttrInputs(pAttrsBox, {});
  };

  // ---- JSON Import/Export ----
  document.getElementById('btn-export-json').onclick = () => {
    const payload = { version: 1, characterTags: state.characterTags, characters: state.characters, relations: state.relations };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'char-relmap.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
  };
  const fileInput = document.getElementById('file-import-json');
  document.getElementById('btn-import-json').onclick = () => fileInput.click();
  fileInput.onchange = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result));
        if (!json || !Array.isArray(json.characters) || !Array.isArray(json.relations)) {
          alert('フォーマットが不正です（characters/relations が見つかりません）'); return;
        }
        if (Array.isArray(json.characterTags)) setCharacterTags(json.characterTags);
        setData(json.characters, json.relations);
        // attrs 不足分を補正
        state.characters.forEach(c => { if (!c.attrs) c.attrs = {}; state.characterTags.forEach(k=>{ if(!(k in c.attrs)) c.attrs[k]=''; }); });
        reloadGraphFromState();
      } catch (err) {
        alert('JSONの読み込みに失敗: ' + (err?.message || err));
      } finally {
        fileInput.value = '';
      }
    };
    reader.readAsText(file);
  };

  // ---- 選択編集（ノードまたはエッジ1つ）----
  const btnEdit = document.getElementById('btn-edit');
  const dlgE = document.getElementById('dlg-edit');
  const formE = document.getElementById('form-edit');
  const editFields = document.getElementById('edit-fields');

  btnEdit.onclick = () => {
    const nSel = cySelectCount('node'), eSel = cySelectCount('edge');
    if (nSel + eSel !== 1){ alert('人物または関係を1つ選択してください'); return; }
    editFields.innerHTML = '';
    if (nSel === 1) openEditNode();
    else openEditEdge();
  };

  document.getElementById('e-cancel').onclick = () => dlgE.close();

  function openEditNode(){
    const n = getSelected('node');
    const id = n.id();
    const data = n.data();
    const char = state.characters.find(c => String(c.id ?? c.name) === id);
    const attrs = char?.attrs || {};

    document.getElementById('edit-title').textContent = '人物を編集';

    const html = `
      <div class="row"><label>ID</label><input id="e-id" type="text" value="${escapeHtml(id)}" disabled></div>
      <div class="row"><label>名前</label><input id="e-name" type="text" value="${escapeHtml(data.name||'')}"></div>
      <div class="row"><label>画像URL</label><input id="e-image" type="text" value="${escapeHtml(data.image||'')}"></div>
      <div class="row"><label>背景色</label><input id="e-bg" type="color" value="${escapeColor(data.nodeColor||'#f3f4f6')}"></div>
      <div class="row"><label>文字色</label><input id="e-fg" type="color" value="${escapeColor(data.textColor||'#111827')}"></div>
      <fieldset class="modal"><legend class="muted">属性（共通タグ）</legend>
        ${state.characterTags.map(key => `
          <div class="row"><label>${escapeHtml(key)}</label>
            <input id="e-attr-${key}" type="text" value="${escapeHtml(attrs[key]||'')}">
          </div>
        `).join('')}
      </fieldset>
    `;
    editFields.innerHTML = html;

    formE.onsubmit = (e)=>{
      e.preventDefault();
      const name  = getVal('e-name');
      const image = getVal('e-image') || null;
      const nodeColor = getVal('e-bg') || null;
      const textColor = getVal('e-fg') || null;

      const newAttrs = {};
      state.characterTags.forEach(k=>{
        newAttrs[k] = (document.getElementById(`e-attr-${k}`)?.value) ?? '';
      });

      // state 更新
      updateCharacter(id, { name, image, nodeColor, textColor, attrs: newAttrs });
      // グラフ更新
      patchSelectedNodeData({ name, image, nodeColor, textColor });
      dlgE.close();
    };

    dlgE.showModal();
  }

  function openEditEdge(){
    const e = getSelected('edge');
    const d = e.data();
    document.getElementById('edit-title').textContent = '関係を編集';

    const html = `
      <div class="row"><label>From</label><input id="e-from" type="text" value="${escapeHtml(d.source)}" disabled></div>
      <div class="row"><label>To</label><input id="e-to" type="text" value="${escapeHtml(d.target)}" disabled></div>
      <div class="row"><label>関係名</label><input id="e-label" type="text" value="${escapeHtml(d.label||'')}"></div>
      <div class="row"><label>強さ（1-5）</label><input id="e-strength" type="number" min="1" max="5" value="${Number(d.strength||3)}"></div>
      <div class="row"><label>種別</label><input id="e-type" type="text" value="${escapeHtml(d.type||'')}"></div>
      <div class="row"><label>相互</label>
        <select id="e-mutual">
          <option value="false" ${!d.mutual?'selected':''}>いいえ</option>
          <option value="true"  ${d.mutual?'selected':''}>はい</option>
        </select>
      </div>
      <div class="row"><label>線色</label><input id="e-line" type="color" value="${escapeColor(d.edgeColor||'#6b7280')}"></div>
      <div class="row"><label>文字色</label><input id="e-text" type="color" value="${escapeColor(d.textColor||'#111827')}"></div>
    `;
    editFields.innerHTML = html;

    formE.onsubmit = (ev)=>{
      ev.preventDefault();
      const label = getVal('e-label');
      const strength = Math.max(1, Math.min(5, Number(getVal('e-strength')||3)));
      const type = getVal('e-type');
      const mutual = (getVal('e-mutual') === 'true');
      const edgeColor = getVal('e-line') || null;
      const textColor = getVal('e-text') || null;

      const idx = findRelationIndex(r =>
        r.from === d.source && r.to === d.target && r.label === d.label && Number(r.strength||3) === Number(d.strength||3)
      );
      if (idx >= 0){
        updateRelation(idx, { label, strength, type, mutual, edgeColor, textColor });
      }
      patchSelectedEdgeData({ label, strength, type, mutual, edgeColor, textColor });
      dlgE.close();
    };

    dlgE.showModal();
  }

  // ---- Import/Export wiring is above (unchanged from previous message) ----
}

// ---- helpers ----
function cySelectCount(kind){ return window.cy?.$(`${kind}:selected`).length || 0; }
function getSelected(kind){ return window.cy?.$(`${kind}:selected`)[0]; }
function getVal(id){ return (document.getElementById(id)?.value || '').trim(); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function escapeColor(s){ try{ if(!s) return '#000000'; const c=String(s); return c.startsWith('#')?c:'#000000'; }catch{return '#000000'} }

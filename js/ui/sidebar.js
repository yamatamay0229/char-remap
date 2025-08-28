// ui/sidebar.js — 選択対象の詳細編集UI（骨格）

let $root;

/**
 * [API] サイドバーを描画（初期は「未選択」表示）
 */
export function renderSidebar(container) {
  $root = container;
  showEmpty();
}

/**
 * [API] ノード選択時に呼ぶ（graph から selection イベントで）
 */
export function showNodeDetail(nodeData) {
  if (!$root) return;
  $root.innerHTML = `
    <div class="sidebar-section">
      <div class="sidebar-title">人物</div>
      <div class="sidebar-row"><label style="width:80px">ID</label><input type="text" value="${escapeHtml(nodeData.id)}" disabled></div>
      <div class="sidebar-row"><label style="width:80px">名前</label><input id="sb-node-name" type="text" value="${escapeHtml(nodeData.label||'')}"></div>
      <div class="sidebar-row"><label style="width:80px">色</label><input id="sb-node-color" type="color" value="${nodeData.nodeColor || '#cccccc'}"></div>
      <div class="sidebar-row"><label style="width:80px">文字色</label><input id="sb-node-text" type="color" value="${nodeData.textColor || '#111111'}"></div>
    </div>
    <div class="sidebar-section">
      <button class="menu-btn" id="sb-apply-node">適用</button>
      <button class="menu-btn" id="sb-delete-node">削除</button>
    </div>
  `;

  // 適用
  $root.querySelector('#sb-apply-node').onclick = () => {
    const patch = {
      name: $root.querySelector('#sb-node-name').value,
      nodeColor: $root.querySelector('#sb-node-color').value,
      textColor: $root.querySelector('#sb-node-text').value,
    };
    document.dispatchEvent(new CustomEvent('app:command', {
      detail: { name: 'updateCharacter', id: nodeData.id, patch }
    }));
  };
  // 削除
  $root.querySelector('#sb-delete-node').onclick = () => {
    document.dispatchEvent(new CustomEvent('app:command', {
      detail: { name: 'removeCharacter', id: nodeData.id }
    }));
  };
}

/**
 * [API] エッジ選択時に呼ぶ
 */
export function showEdgeDetail(edgeData) {
  if (!$root) return;
  $root.innerHTML = `
    <div class="sidebar-section">
      <div class="sidebar-title">関係</div>
      <div class="sidebar-row"><label style="width:80px">ID</label><input type="text" value="${escapeHtml(edgeData.id)}" disabled></div>
      <div class="sidebar-row"><label style="width:80px">ラベル</label><input id="sb-edge-label" type="text" value="${escapeHtml(edgeData.label||'')}"></div>
      <div class="sidebar-row"><label style="width:80px">強さ</label><input id="sb-edge-strength" type="number" min="1" max="8" value="${Number(edgeData.strength||3)}"></div>
      <div class="sidebar-row"><label style="width:80px">相互</label><input id="sb-edge-mutual" type="checkbox" ${edgeData.mutual?'checked':''}></div>
    </div>
    <div class="sidebar-section">
      <button class="menu-btn" id="sb-apply-edge">適用</button>
      <button class="menu-btn" id="sb-delete-edge">削除</button>
    </div>
  `;
  $root.querySelector('#sb-apply-edge').onclick = () => {
    const patch = {
      label: $root.querySelector('#sb-edge-label').value,
      strength: Number($root.querySelector('#sb-edge-strength').value),
      mutual: $root.querySelector('#sb-edge-mutual').checked,
    };
    document.dispatchEvent(new CustomEvent('app:command', {
      detail: { name: 'updateRelation', id: edgeData.id, patch }
    }));
  };
  $root.querySelector('#sb-delete-edge').onclick = () => {
    document.dispatchEvent(new CustomEvent('app:command', {
      detail: { name: 'removeRelation', id: edgeData.id }
    }));
  };
}

/** [API] 未選択表示 */
export function showEmpty(){
  if (!$root) return;
  $root.innerHTML = `
    <div class="sidebar-section">
      <div class="sidebar-title">プロパティ</div>
      <div class="sidebar-empty">何も選択されていません</div>
    </div>
  `;
}

function escapeHtml(s=''){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

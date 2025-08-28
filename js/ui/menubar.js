// ui/menubar.js — 上部メニューバーの描画とイベント発火担当

/**
 * [API] メニューバーを描画し、ボタンクリックで app:command を発火する。
 * 使い方: renderMenubar(document.getElementById('menubar'));
 */
export function renderMenubar(container, initial = {}) {
  container.innerHTML = `
    <div class="menu-group">
      <button class="menu-btn" data-cmd="newCharacter">＋人物</button>
      <button class="menu-btn" data-cmd="newRelation">＋関係</button>
      <span class="menu-sep"></span>
      <button class="menu-btn" data-cmd="undo">Undo</button>
      <button class="menu-btn" data-cmd="redo">Redo</button>
      <span class="menu-sep"></span>
      <button class="menu-btn" data-cmd="saveJson">保存</button>
      <button class="menu-btn" data-cmd="loadJson">読み込み</button>
    </div>
    <div class="menu-group" style="margin-left:auto">
      <label class="menu-toggle" title="グリッド表示">
        <input id="toggle-grid" type="checkbox" ${initial.gridVisible ? 'checked' : ''}>
        グリッド
      </label>
      <label class="menu-toggle" title="グリッド不透明度">
        不透明度
        <input id="grid-opacity-range" type="range" min="0" max="1" step="0.05" value="${initial.gridOpacity ?? 0.25}" style="width:120px">
        <input id="grid-opacity-num" type="number" min="0" max="1" step="0.05" value="${initial.gridOpacity ?? 0.25}" style="width:64px">
      </label>
      <button class="menu-btn" data-cmd="toggleTheme">テーマ</button>
    </div>
  `;

  // クリック → app:command(detail:{name})
  container.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cmd]');
    if (!btn) return;
    const name = btn.dataset.cmd;
    document.dispatchEvent(new CustomEvent('app:command', { detail: { name } }));
  });

  // グリッド表示切替
  const gridToggle = container.querySelector('#toggle-grid');
  if (gridToggle) {
    gridToggle.addEventListener('change', () => {
      document.dispatchEvent(new CustomEvent('app:command', {
        detail: { name: 'gridVisible', value: gridToggle.checked }
      }));
    });
  }

  // 不透明度（range/num 双方向同期）
  const $range = container.querySelector('#grid-opacity-range');
  const $num   = container.querySelector('#grid-opacity-num');
  const emit = (v) => {
    document.dispatchEvent(new CustomEvent('app:command', {
      detail: { name: 'gridOpacity', value: Number(v) }
    }));
  };
  if ($range && $num) {
    const sync = (v) => { $range.value = v; $num.value = v; emit(v); };
    $range.addEventListener('input', e => sync(e.target.value));
    $num.addEventListener('input',   e => sync(e.target.value));
  }
}

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
      <label class="menu-toggle">
        <input id="toggle-grid" type="checkbox" ${initial.gridVisible ? 'checked' : ''}>
        グリッド
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

  // グリッド表示切替は detail: {name:'gridVisible', value}
  const gridToggle = container.querySelector('#toggle-grid');
  if (gridToggle) {
    gridToggle.addEventListener('change', () => {
      document.dispatchEvent(new CustomEvent('app:command', {
        detail: { name: 'gridVisible', value: gridToggle.checked }
      }));
    });
  }
}

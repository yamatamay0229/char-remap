// アプリ設定（永続化）— とりあえず空動作でも壊れないように

export const settings = {
  theme: 'light',
  gridSize: 50,
  gridOpacity: 0.25,
  snap: true,
  autoContrast: true,
  contrastMin: 1.3,
  activeSheetId: 'default',
  flags: { spreadsheet:false, groups:false, waypoints:false, physics:false },
};

export function setSetting(key, value){
  settings[key] = value;
  try { localStorage.setItem('char-relmap:settings', JSON.stringify(settings)); } catch {}
  // 変更通知が必要ならここで
}

export function onSettingsChange(/*cb*/){
  // そのうち PubSub を入れる。今はNo-Op。
  return () => {};
}

export function applyTheme(){
  const html = document.documentElement;
  html.setAttribute('data-theme', settings.theme || 'light');
  document.dispatchEvent(new CustomEvent('app:themechanged'));
}

// 初期読込
(function restore(){
  try{
    const raw = localStorage.getItem('char-relmap:settings');
    if (raw) Object.assign(settings, JSON.parse(raw));
  }catch{}
})();

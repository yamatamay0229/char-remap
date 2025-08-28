const saved = JSON.parse(localStorage.getItem('settings') || '{}');

export const settings = {
  theme: saved.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  snap: saved.snap ?? true,
  gridOpacity: saved.gridOpacity ?? 0.25,
  gridSize: saved.gridSize ?? 50,          // まだGRIDはstate.jsの定数を使ってOK。後で寄せ替え可
  autoContrast: saved.autoContrast ?? true,
  contrastMin: saved.contrastMin ?? 1.3,   // ★ あなたの希望値
};

const subs = new Set();
function persist(){ localStorage.setItem('settings', JSON.stringify(settings)); }
export function setSetting(key, value){
  settings[key] = value;
  persist();
  subs.forEach(fn => fn(settings));
}
export function onSettingsChange(fn){
  subs.add(fn); return ()=>subs.delete(fn);
}

/* テーマ適用：<html data-theme="..."> */
export function applyTheme(){
  document.documentElement.setAttribute('data-theme', settings.theme);
}
applyTheme();

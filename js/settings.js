// settings.js — 設定の真実の源泉 / 永続化 / テーマ切替
const saved = JSON.parse(localStorage.getItem('settings') || '{}');

/** [STORE] ここに全設定を集約。 */
export const settings = {
  theme: saved.theme ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  gridSize: saved.gridSize ?? 50,
  gridOpacity: saved.gridOpacity ?? 0.25,
  snap: saved.snap ?? true,
  autoContrast: saved.autoContrast ?? true,
  contrastMin: saved.contrastMin ?? 1.3,  // 近似色補正の最小コントラスト
};

const subs = new Set();
const persist = () => localStorage.setItem('settings', JSON.stringify(settings));

/** [API] 設定を1つ更新して購読者に通知。 */
export function setSetting(k, v){ settings[k] = v; persist(); subs.forEach(fn => fn(settings)); }
/** [API] 設定変更の購読を登録/解除。 */
export function onSettingsChange(fn){ subs.add(fn); return () => subs.delete(fn); }

/** [API] テーマ反映（<html data-theme> 更新）→ 次フレームで app:themechanged を通知。 */
export function applyTheme(){
  document.documentElement.dataset.theme = settings.theme;
  requestAnimationFrame(() => document.dispatchEvent(new CustomEvent('app:themechanged')));
}

// io.js —— JSON入出力とローカル自動保存
import { getSnapshot, setDataFromSnapshot, CURRENT_VERSION } from './state.js';

// ファイルダウンロード（手動エクスポート）
export function exportJSON(filename){
  const snap = getSnapshot();
  const blob = new Blob([JSON.stringify(snap, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename || `char-relmap.v${CURRENT_VERSION}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// テキストからインポート（手動インポート）
export function importJSONText(text){
  const raw = JSON.parse(text);
  setDataFromSnapshot(raw);
}

// ファイル入力からインポート（<input type="file"> を使う場合）
export function importFromFile(file){
  return new Promise((resolve, reject)=>{
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => {
      try { importJSONText(String(fr.result)); resolve(true); }
      catch(e){ reject(e); }
    };
    fr.readAsText(file, 'utf-8');
  });
}
export function importJSON(/*text*/){ /* TODO: setData */ }
export function exportCSV(/*type*/) { /* TODO */ }
export function importCSV(/*type, text*/) { /* TODO */ }

// ===== ローカル自動保存 =====

const LS_KEY = 'charrelmap.snapshot.v2';

let _saveTimer = 0;
export function autosaveSchedule(){
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(()=> {
    try {
      const snap = getSnapshot();
      localStorage.setItem(LS_KEY, JSON.stringify(snap));
    } catch(e) {
      console.warn('[autosave] failed', e);
    }
  }, 300); // デバウンス
}

export function loadFromLocal(){
  try{
    const text = localStorage.getItem(LS_KEY);
    if (!text) return false;
    const raw = JSON.parse(text);
    setDataFromSnapshot(raw);
    return true;
  }catch(e){
    console.warn('[loadFromLocal] failed', e);
    return false;
  }
}

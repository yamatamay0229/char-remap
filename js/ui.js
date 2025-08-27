import { state, addCharacter, addRelation } from './state.js';
import { addNodeToGraph, addEdgeToGraph, deleteSelection,
         layoutRandom, layoutCircle, layoutCenterOnSelection } from './graph.js';

export function wireUI(){
  // レイアウト
  document.getElementById('btn-random').onclick = layoutRandom;
  document.getElementById('btn-circle').onclick = layoutCircle;
  document.getElementById('btn-center').onclick = layoutCenterOnSelection;

  // 人物追加
  const dlgP = document.getElementById('dlg-person');
  const formP = document.getElementById('form-person');
  document.getElementById('btn-add-person').onclick = () => { formP.reset(); dlgP.showModal(); };
  document.getElementById('p-cancel').onclick = () => dlgP.close();
  formP.onsubmit = (e)=>{
    e.preventDefault();
    try{
      const id    = document.getElementById('p-id').value.trim();
      const name  = document.getElementById('p-name').value.trim();
      const image = (document.getElementById('p-image').value.trim() || null);
      if (!id || !name) return;
      addCharacter({ id, name, image });
      addNodeToGraph({ id, name, image });
      dlgP.close();
    }catch(err){ alert(err.message || String(err)); }
  };

  // 関係追加
  const dlgR = document.getElementById('dlg-relation');
  const formR = document.getElementById('form-relation');
  const selFrom = document.getElementById('r-from');
  const selTo   = document.getElementById('r-to');

  function refreshSelects(){
    const opts = state.characters.map(c => `<option value="${escapeHtml(String(c.id ?? c.name))}">${escapeHtml(c.name)}</option>`).join('');
    selFrom.innerHTML = opts; selTo.innerHTML = opts;
  }

  document.getElementById('btn-add-relation').onclick = () => {
    if (state.characters.length < 2){ alert('人物が2人以上必要です'); return; }
    refreshSelects();
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

      addRelation({ from, to, label, strength, type, mutual });
      addEdgeToGraph({ from, to, label, strength, type, mutual });
      dlgR.close();
    }catch(err){ alert(err.message || String(err)); }
  };

  // 削除
  document.getElementById('btn-delete').onclick = deleteSelection;
}

function escapeHtml(s){ return s.replace(/[&<>"']/g, m => ({'&':'&','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

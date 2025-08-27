async function loadData() {
  const characters = await fetch('data/characters.json').then(r => r.json());
  const relations = await fetch('data/relations.json').then(r => r.json());

  console.log("人物データ:", characters);
  console.log("関係データ:", relations);

  const graphDiv = document.getElementById('graph');
  graphDiv.textContent = "データ読み込み完了！（コンソールを確認してください）";
}

loadData();


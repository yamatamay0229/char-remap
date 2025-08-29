// アプリデータの唯一の真実（No-Opで壊れない骨だけ）

const snapshot = {
  version: 1,
  characterTags: [],
  characters: [],      // {id,name,attrs?,image?,nodeColor?,textColor?,pos?}
  relations: [],       // {id,from,to,label?,strength?,type?,mutual?,edgeColor?,textColor?}
  groups: [],          // {id,name,color?,members[]}
  sheets: [ { id:'default', name:'Default', positions:{}, waypoints:{}, visible:{} } ],
};

export function getSnapshot(){ return snapshot; }
export function setData(/*snap*/){ /* TODO: migrate & assign */ }
export function migrateSnapshot(/*old*/){ /* TODO */ }
export function generateId(prefix='id'){ return `${prefix}_${Math.random().toString(36).slice(2,9)}`; }

// Selectors
export function getCharacter(/*id*/){ /* TODO */ }
export function listCharacters(){ return snapshot.characters; }
export function getRelation(/*id*/){ /* TODO */ }
export function listRelations(){ return snapshot.relations; }
export function listRelationsByNode(/*charId*/){ /* TODO */ }
export function listRelationsByPair(/*a,b*/){ /* TODO */ }
export function getGroup(/*id*/){ /* TODO */ }
export function listGroups(){ return snapshot.groups; }
export function getTagKeys(){ return snapshot.characterTags; }

// Characters CRUD
export function addCharacter(/*c*/){ /* TODO */ }
export function updateCharacter(/*id, patch*/){ /* TODO */ }
export function removeCharacterById(/*id*/){ /* TODO */ }

// Relations CRUD
export function addRelation(/*r*/){ /* TODO return id */ }
export function updateRelation(/*id, patch*/){ /* TODO */ }
export function removeRelationById(/*id*/){ /* TODO */ }

// Groups CRUD
export function addGroup(/*g*/){ /* TODO return id */ }
export function updateGroup(/*id, patch*/){ /* TODO */ }
export function removeGroupById(/*id*/){ /* TODO */ }
export function addMembers(/*groupId, charIds*/){ /* TODO */ }
export function removeMembers(/*groupId, charIds*/){ /* TODO */ }

// Tags
export function setCharacterTags(/*keys*/){ /* TODO */ }
export function addTagKey(/*key*/){ /* TODO */ }
export function renameTagKey(/*oldKey,newKey*/){ /* TODO */ }
export function removeTagKey(/*key*/){ /* TODO */ }
export function reorderTagKeys(/*newOrder*/){ /* TODO */ }

// Sheets
export function createSheet(/*name*/){ /* TODO return id */ }
export function renameSheet(/*id,name*/){ /* TODO */ }
export function deleteSheet(/*id*/){ /* TODO */ }
export function setNodePos(/*sheetId,charId,pos*/){ /* TODO */ }
export function setEdgeWaypoints(/*sheetId,relId,points*/){ /* TODO */ }
export function setSheetVisibility(/*sheetId,visible*/){ /* TODO */ }
export function getSheet(/*id*/){ /* TODO */ }
export function listSheets(){ return snapshot.sheets; }

// Integrity
export function existsCharacter(/*id*/){ /* TODO */ }
export function existsRelation(/*id*/){ /* TODO */ }
export function existsGroup(/*id*/){ /* TODO */ }
export function relinkAfterDelete(/*id*/){ /* TODO */ }

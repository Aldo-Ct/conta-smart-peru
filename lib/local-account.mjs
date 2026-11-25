export function localKey(username){if(typeof username!=='string'||!username)throw new Error('Usuario inválido.');return `conta-smart-v2:${username}`;}
export function readAccountData(storage,username){
 const key=localKey(username),current=storage.getItem(key);if(current!==null)return current;
 try{const marker=JSON.parse(storage.getItem('conta-smart-cloud-revision')||'null');if(marker?.username===username){const legacy=storage.getItem('conta-smart-v1');if(legacy!==null){storage.setItem(key,legacy);return legacy;}}}catch{}
 return null;
}

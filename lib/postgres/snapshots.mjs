import {validateSnapshot} from './validate-snapshot.mjs';
import {validateTransition} from './validate-transition.mjs';
/** Almacenamiento de instantáneas. La sesión debe ser autenticada por el servidor. */
export class SnapshotConflict extends Error {
  constructor(){super('Los datos cambiaron en otra sesión; actualice antes de guardar.');this.name='SnapshotConflict';}
}
function checkUser(user,write=false){
  if(!user || !user.id || !user.company_id || !['admin','accountant','viewer'].includes(user.role))throw new Error('Sesión inválida.');
  if(write && user.role==='viewer')throw new Error('No tiene permiso para modificar datos.');
}
export class SnapshotStore {
  constructor(pool){this.pool=pool;}
  async load(user){
    checkUser(user);
    const result=await this.pool.query('SELECT revision, data FROM snapshots WHERE company_id=$1',[user.company_id]);
    const row=result.rows[0];return row?{revision:Number(row.revision),data:row.data}:null;
  }
  async save(user,revision,data){
    checkUser(user,true);
    if(!Number.isSafeInteger(revision)||revision<0 || !data || typeof data!=='object' || Array.isArray(data))throw new Error('Datos o revisión inválidos.');
    validateSnapshot(data);
    const serialized=JSON.stringify(data);
    if(Buffer.byteLength(serialized,'utf8')>10*1024*1024)throw new Error('Los datos exceden el tamaño permitido.');
    const client=await this.pool.connect();
    try{
      await client.query('BEGIN');
      if(revision>0){const previous=await client.query('SELECT revision, data FROM snapshots WHERE company_id=$1 FOR UPDATE',[user.company_id]);if(!previous.rows.length||Number(previous.rows[0].revision)!==revision)throw new SnapshotConflict();validateTransition(previous.rows[0].data,data,user.role);}
      const result=revision===0
        ? await client.query('INSERT INTO snapshots (company_id, data) VALUES ($1, $2::jsonb) ON CONFLICT (company_id) DO NOTHING RETURNING revision',[user.company_id,serialized])
        : await client.query('UPDATE snapshots SET data=$2::jsonb, revision=revision+1, updated_at=now() WHERE company_id=$1 AND revision=$3 RETURNING revision',[user.company_id,serialized,revision]);
      if(result.rows.length!==1)throw new SnapshotConflict();
      await client.query('INSERT INTO audit_events(company_id,user_id,action) VALUES ($1,$2,$3)',[user.company_id,user.id,'snapshot_saved']);
      await client.query('COMMIT');
      return Number(result.rows[0].revision);
    }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }
}

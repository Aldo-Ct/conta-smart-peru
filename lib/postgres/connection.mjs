import pg from 'pg';
const {Pool}=pg;
/** Se reciben parámetros explícitos para no reutilizar ni cambiar la base de otra aplicación. */
export function createContaPool(config){
  if(!config?.host || !config?.user || !config?.password || config.database!=='conta_smart') throw new Error('Falta configuración de la base de Conta Smart.');
  return new Pool({host:config.host,port:config.port||5432,user:config.user,password:config.password,database:config.database,ssl:{rejectUnauthorized:true},max:5,connectionTimeoutMillis:10000,idleTimeoutMillis:30000});
}

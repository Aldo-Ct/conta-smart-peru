import {SnapshotConflict} from './snapshots.mjs';
import {SnapshotValidationError} from './validate-snapshot.mjs';
const COOKIE='conta_session';
const reply=(res,status,body,extra={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});res.end(JSON.stringify(body));};
function cookie(req){const raw=req.headers.cookie||'';return raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';}
async function body(req){
 let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>10*1024*1024)throw new Error('Solicitud demasiado grande.');chunks.push(chunk);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new Error('JSON inválido.');}
}
/** API aislada; requiere HTTPS en producción y una lista explícita de orígenes. */
export function createContaApi({auth,store,allowedOrigins,secure=true}){
 if(!allowedOrigins?.length)throw new Error('Debe configurar orígenes permitidos.');
 const attempts=new Map();
 return async(req,res)=>{
  let path;try{path=new URL(req.url,'http://localhost').pathname;}catch{return reply(res,400,{error:'Solicitud inválida.'});}
  if(!path.startsWith('/api/conta/'))return false;
  const mutating=!['GET','HEAD'].includes(req.method);
  if(mutating&&(!req.headers.origin||!allowedOrigins.includes(req.headers.origin)))return reply(res,403,{error:'Origen no autorizado.'});
  if(mutating&&!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))return reply(res,415,{error:'Se requiere JSON.'});
  try{
   if(path==='/api/conta/login'&&req.method==='POST'){
    const ip=req.socket.remoteAddress||'unknown',now=Date.now(),prior=(attempts.get(ip)||[]).filter(t=>now-t<60000);
    if(prior.length>=10)return reply(res,429,{error:'Demasiados intentos. Intente nuevamente.'});
    prior.push(now);attempts.set(ip,prior);
    if(attempts.size>10000)for(const [key,times] of attempts)if(now-times.at(-1)>=60000)attempts.delete(key);
    const input=await body(req),token=await auth.login(input.username,input.password);
    if(!token)return reply(res,401,{error:'Usuario o contraseña incorrectos.'});
    attempts.delete(ip);
    return reply(res,200,{ok:true},{'Set-Cookie':`${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure?'; Secure':''}`});
   }
   if(path==='/api/conta/logout'&&req.method==='POST'){
    await auth.logout(cookie(req));return reply(res,200,{ok:true},{'Set-Cookie':`${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure?'; Secure':''}`});
   }
   const user=await auth.authenticate(cookie(req));if(!user)return reply(res,401,{error:'Inicie sesión.'});
   if(path==='/api/conta/session'&&req.method==='GET')return reply(res,200,{user:{username:user.username,role:user.role}});
   if(path==='/api/conta/data'&&req.method==='GET')return reply(res,200,{snapshot:await store.load(user)});
   if(path==='/api/conta/data'&&req.method==='PUT'){
    if(user.role==='viewer')return reply(res,403,{error:'No tiene permiso para modificar datos.'});
    const input=await body(req),revision=await store.save(user,input.revision,input.data);return reply(res,200,{revision});
   }
   return reply(res,404,{error:'Ruta no encontrada.'});
  }catch(error){if(error instanceof SnapshotConflict)return reply(res,409,{error:error.message});if(error instanceof SnapshotValidationError||error instanceof SyntaxError||['JSON inválido.','Solicitud demasiado grande.','Datos o revisión inválidos.','Los datos exceden el tamaño permitido.'].includes(error?.message))return reply(res,400,{error:error.message});return reply(res,500,{error:'No se pudo completar la operación.'});}
 };
}

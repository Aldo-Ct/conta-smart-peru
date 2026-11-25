/** Servidor de demostración local: los datos no se conectan a Azure. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import {createContaApi} from '../lib/postgres/http-api.mjs';
import {SnapshotConflict} from '../lib/postgres/snapshots.mjs';
import {validateSnapshot} from '../lib/postgres/validate-snapshot.mjs';
import {validateTransition} from '../lib/postgres/validate-transition.mjs';

const port=Number(process.env.PORT||3001),root=path.resolve('out');
const directory=path.join(os.homedir(),'.config','conta-smart'),file=path.join(directory,'datos-locales.json');
const access=await fs.readFile(path.join(directory,'acceso.txt'),'utf8');
const password=access.match(/^Contraseña:\s*(.+)$/m)?.[1]?.trim();
if(!password)throw new Error('No se encontró la contraseña local en acceso.txt.');
const digest=value=>createHash('sha256').update(value).digest();
const sessions=new Set();const user={id:'local',company_id:'local',username:'admin',role:'admin'};
const auth={async login(name,pass){if(name!=='admin'||typeof pass!=='string'||!timingSafeEqual(digest(pass),digest(password)))return null;const token=randomBytes(32).toString('base64url');sessions.add(token);return token},async authenticate(token){return sessions.has(token)?user:null},async logout(token){sessions.delete(token)}};
await fs.mkdir(directory,{recursive:true,mode:0o700});
let snapshot;try{snapshot=JSON.parse(await fs.readFile(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e;snapshot=null}
let writing=Promise.resolve();
const store={async load(){return snapshot},async save(_user,revision,data){const operation=writing.then(async()=>{if((snapshot?.revision||0)!==revision)throw new SnapshotConflict();validateSnapshot(data);validateTransition(snapshot?.data||null,data,'admin');const next={revision:revision+1,data};const temp=file+'.tmp';await fs.writeFile(temp,JSON.stringify(next),{mode:0o600});await fs.rename(temp,file);snapshot=next;return next.revision});writing=operation.catch(()=>{});return operation},async reset(_user,revision){if(!snapshot||snapshot.revision!==revision)throw new SnapshotConflict();const data={systemResetRevision:revision+1,company:{name:'',ruc:'',igv:18},accounts:snapshot.data.accounts,products:[],docs:[],entries:[],dark:false,demo:false,settlements:[],inventoryMovements:[],closedPeriods:[],bankAccounts:[],bankMovements:[],bankStatements:[],bankMatches:[],bankCheques:[],cashAudits:[]};validateSnapshot(data);const next={revision:revision+1,data};await fs.writeFile(file,JSON.stringify(next),{mode:0o600});snapshot=next;return next.revision}};
const api=createContaApi({auth,store,allowedOrigins:[`http://localhost:${port}`,`http://127.0.0.1:${port}`],secure:false});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');if(url.pathname.startsWith('/api/conta/'))return api(req,res);if(url.pathname==='/api/documento'){res.writeHead(503,{'Content-Type':'application/json'});return res.end(JSON.stringify({error:'La consulta de documentos no está configurada en la instancia local.'}))}let name;try{name=decodeURIComponent(url.pathname)}catch{res.writeHead(400);return res.end()}const target=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end()}try{const contents=await fs.readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream'});res.end(contents)}catch{res.writeHead(404);res.end('No encontrado')}}).listen(port,'127.0.0.1',()=>console.log(`Conta Smart local disponible en http://localhost:${port}`));

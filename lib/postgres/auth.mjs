import {randomBytes,createHash,scrypt,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
const hashToken=token=>createHash('sha256').update(token).digest('hex');
export async function passwordRecord(password){
 if(typeof password!=='string'||password.length<12||password.length>256)throw new Error('La contraseña debe tener entre 12 y 256 caracteres.');
 const salt=randomBytes(16).toString('hex');return {salt,hash:(await derive(password,salt,64)).toString('hex')};
}
export class PostgresAuth {
 constructor(pool){this.pool=pool;}
 async login(username,password){
  if(typeof username!=='string'||typeof password!=='string'||username.length>100||password.length>256)return null;
  const name=username.trim().toLowerCase();
  const result=await this.pool.query('SELECT id, password_salt, password_hash, active, role FROM users WHERE username=$1',[name]);
  const user=result.rows[0],salt=user?.password_salt||'0'.repeat(32),expected=Buffer.from(user?.password_hash||'0'.repeat(128),'hex');
  const candidate=await derive(password,salt,64);
  if(expected.length!==64 || !timingSafeEqual(candidate,expected) || !user?.active || name!=='admin' || user.role!=='admin')return null;
  const token=randomBytes(32).toString('base64url');
  await this.pool.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '30 days')",[hashToken(token),user.id]);return token;
 }
 async authenticate(token){
  if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
  const result=await this.pool.query("SELECT u.id,u.company_id,u.username,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true AND u.username='admin' AND u.role='admin'",[hashToken(token)]);
  return result.rows[0]||null;
 }
 async logout(token){if(typeof token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(token))await this.pool.query('DELETE FROM sessions WHERE token_hash=$1',[hashToken(token)]);}
}

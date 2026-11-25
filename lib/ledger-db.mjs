import {DatabaseSync} from 'node:sqlite';
import {randomBytes,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {cents} from './accounting.mjs';

/** Base transaccional independiente. No se conecta todavía a la aplicación pública. */
export class LedgerDatabase {
  constructor(path) {
    this.db=new DatabaseSync(path);
    if(this.db.prepare('PRAGMA user_version').get().user_version>1){this.db.close();throw new Error('La versión de la base de datos es más reciente que la aplicación.');}
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS companies (id TEXT PRIMARY KEY, name TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS accounts (company_id TEXT NOT NULL REFERENCES companies(id), code TEXT NOT NULL, name TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), PRIMARY KEY(company_id,code));
      CREATE TABLE IF NOT EXISTS periods (company_id TEXT NOT NULL REFERENCES companies(id), month TEXT NOT NULL, closed INTEGER NOT NULL DEFAULT 0 CHECK(closed IN (0,1)), PRIMARY KEY(company_id,month));
      CREATE TABLE IF NOT EXISTS journal_entries (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), operation_key TEXT NOT NULL, date TEXT NOT NULL, memo TEXT NOT NULL, reverses_id TEXT REFERENCES journal_entries(id), UNIQUE(company_id,operation_key), UNIQUE(reverses_id));
      CREATE TABLE IF NOT EXISTS journal_lines (id INTEGER PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES journal_entries(id), company_id TEXT NOT NULL, account_code TEXT NOT NULL, account_name TEXT NOT NULL, debit_cents INTEGER NOT NULL CHECK(debit_cents>=0), credit_cents INTEGER NOT NULL CHECK(credit_cents>=0), CHECK((debit_cents=0)!=(credit_cents=0)), FOREIGN KEY(company_id,account_code) REFERENCES accounts(company_id,code));
      CREATE TABLE IF NOT EXISTS audit_events (id INTEGER PRIMARY KEY, company_id TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, company_id TEXT NOT NULL REFERENCES companies(id), username TEXT NOT NULL COLLATE NOCASE UNIQUE, password_salt TEXT NOT NULL, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','accountant','viewer')), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)));
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
      PRAGMA user_version=1;`);
  }
  close(){this.db.close();}
  createCompany(id,name){if(!id||!name?.trim())throw new Error('Empresa inválida.');this.db.prepare('INSERT INTO companies(id,name) VALUES (?,?)').run(id,name.trim());}
  addAccount(company,code,name){if(!/^\d{2,12}$/.test(code)||!name?.trim())throw new Error('Cuenta inválida.');this.db.prepare('INSERT INTO accounts(company_id,code,name) VALUES (?,?,?)').run(company,code,name.trim());}
  createUser({id,company,username,password,role}){
    if(!id||!company||typeof username!=='string'||username.trim().length<3||username.length>100||typeof password!=='string'||password.length<12||password.length>256||!['admin','accountant','viewer'].includes(role))throw new Error('Usuario o contraseña inválidos.');
    const salt=randomBytes(16).toString('hex'),hash=scryptSync(password,salt,64).toString('hex');
    this.db.prepare('INSERT INTO users(id,company_id,username,password_salt,password_hash,role) VALUES (?,?,?,?,?,?)').run(id,company,username.trim(),salt,hash,role);
  }
  login(username,password,now=Date.now()){
    if(typeof username!=='string'||typeof password!=='string'||username.length>100||password.length>256)return null;
    const user=this.db.prepare('SELECT id,password_salt,password_hash,active FROM users WHERE username=?').get(username.trim());
    // Derive a hash even for unknown users so the fast path does not disclose usernames.
    const derived=scryptSync(password,user?.password_salt||'00000000000000000000000000000000',64);
    const expected=Buffer.from(user?.password_hash||'0'.repeat(128),'hex');
    if(!timingSafeEqual(derived,expected)||!user?.active)return null;
    const token=randomBytes(32).toString('base64url'), tokenHash=createHash('sha256').update(token).digest('hex');
    this.db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)').run(tokenHash,user.id,now+8*60*60*1000);
    return token;
  }
  authenticate(token,now=Date.now()){
    if(typeof token!=='string'||token.length!==43)return null;
    const hash=createHash('sha256').update(token).digest('hex');
    return this.db.prepare('SELECT u.id,u.company_id,u.username,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1').get(hash,now)||null;
  }
  logout(token){if(typeof token==='string')this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(createHash('sha256').update(token).digest('hex'));}
  setPeriod(company,month,closed){
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new Error('Periodo inválido.');
    this.db.exec('BEGIN IMMEDIATE');
    try{this.db.prepare('INSERT INTO periods(company_id,month,closed) VALUES (?,?,?) ON CONFLICT(company_id,month) DO UPDATE SET closed=excluded.closed').run(company,month,closed?1:0);this.db.prepare('INSERT INTO audit_events(company_id,action,target) VALUES (?,?,?)').run(company,closed?'period_closed':'period_reopened',month);this.db.exec('COMMIT');}catch(e){this.db.exec('ROLLBACK');throw e;}
  }
  post({id,company,operationKey,date,memo,lines,reversesId=null}){
    if(!id||!company||!operationKey||!memo?.trim()||!/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(date)||!Array.isArray(lines)||lines.length<2)throw new Error('Asiento inválido.');
    const actual=new Date(`${date}T00:00:00Z`);if(Number.isNaN(actual.valueOf())||actual.toISOString().slice(0,10)!==date)throw new Error('Fecha inválida.');
    if(lines.some(l=>!Number.isFinite(l.debit)||!Number.isFinite(l.credit)||Math.abs(l.debit*100-Math.round(l.debit*100))>0.000001||Math.abs(l.credit*100-Math.round(l.credit*100))>0.000001))throw new Error('Los importes admiten hasta dos decimales.');
    const parsed=lines.map(l=>({code:l.account,debit:cents(l.debit),credit:cents(l.credit)}));
    if(parsed.some(l=>!l.code||l.debit<0||l.credit<0||(l.debit===0)===(l.credit===0)))throw new Error('Línea contable inválida.');
    const debit=parsed.reduce((n,l)=>n+l.debit,0), credit=parsed.reduce((n,l)=>n+l.credit,0);
    if(!Number.isSafeInteger(debit)||debit===0||debit!==credit)throw new Error('El asiento debe estar cuadrado.');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if(this.db.prepare('SELECT closed FROM periods WHERE company_id=? AND month=?').get(company,date.slice(0,7))?.closed)throw new Error('El periodo está cerrado.');
      if(reversesId){
        const original=this.db.prepare('SELECT id,date FROM journal_entries WHERE company_id=? AND id=?').get(company,reversesId);
        if(!original)throw new Error('Asiento original no encontrado.');
        if(date<original.date)throw new Error('La fecha de reversión no puede preceder al asiento.');
        const prior=this.db.prepare('SELECT account_code,debit_cents,credit_cents FROM journal_lines WHERE entry_id=?').all(reversesId);
        const tuple=(code,debit,credit)=>JSON.stringify([code,debit,credit]);
        const expected=prior.map(l=>tuple(l.account_code,l.credit_cents,l.debit_cents)).sort();
        const provided=parsed.map(l=>tuple(l.code,l.debit,l.credit)).sort();
        if(JSON.stringify(expected)!==JSON.stringify(provided))throw new Error('La reversión debe invertir exactamente el asiento original.');
      }
      this.db.prepare('INSERT INTO journal_entries(id,company_id,operation_key,date,memo,reverses_id) VALUES (?,?,?,?,?,?)').run(id,company,operationKey,date,memo.trim(),reversesId);
      const lookup=this.db.prepare('SELECT name,active FROM accounts WHERE company_id=? AND code=?');
      const insert=this.db.prepare('INSERT INTO journal_lines(entry_id,company_id,account_code,account_name,debit_cents,credit_cents) VALUES (?,?,?,?,?,?)');
      for(const l of parsed){const account=lookup.get(company,l.code);if(!account||!account.active)throw new Error('Cuenta inexistente o inactiva.');insert.run(id,company,l.code,account.name,l.debit,l.credit);}
      this.db.prepare('INSERT INTO audit_events(company_id,action,target) VALUES (?,?,?)').run(company,'entry_posted',id);
      this.db.exec('COMMIT');
    } catch(e){this.db.exec('ROLLBACK');throw e;}
  }
  reverse({company,originalId,id,operationKey,date,memo}){
    const original=this.db.prepare('SELECT id,date FROM journal_entries WHERE company_id=? AND id=?').get(company,originalId);
    if(!original)throw new Error('Asiento original no encontrado.');
    if(date<original.date)throw new Error('La fecha de reversión no puede preceder al asiento.');
    const lines=this.db.prepare('SELECT account_code,debit_cents,credit_cents FROM journal_lines WHERE entry_id=? ORDER BY id').all(originalId).map(l=>({account:l.account_code,debit:l.credit_cents/100,credit:l.debit_cents/100}));
    this.post({id,company,operationKey,date,memo,lines,reversesId:originalId});
  }
  listEntries(company){return this.db.prepare('SELECT id,operation_key,date,memo,reverses_id FROM journal_entries WHERE company_id=? ORDER BY date,id').all(company);}
  listLines(company){return this.db.prepare('SELECT e.id,e.date,l.account_code,l.account_name,l.debit_cents,l.credit_cents FROM journal_entries e JOIN journal_lines l ON l.entry_id=e.id WHERE e.company_id=? ORDER BY e.date,e.id,l.id').all(company);}
}

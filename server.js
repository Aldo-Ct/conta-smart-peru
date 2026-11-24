const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, 'out');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
const requests = new Map();
http.createServer(async (req,res)=>{
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  if (pathname === '/api/documento') {
    const doc = new URL(req.url, 'http://localhost').searchParams.get('numero') || '';
    const type = /^\d{8}$/.test(doc) ? 'dni' : /^\d{11}$/.test(doc) ? 'ruc' : null;
    const reply = (status, body) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(body)); };
    if (!type) return reply(400,{error:'Ingrese un DNI de 8 o RUC de 11 dígitos.'});
    if (!process.env.APIPERU_TOKEN) return reply(503,{error:'La consulta de identidad no está configurada.'});
    const ip = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const recent = (requests.get(ip) || []).filter(t => now-t < 60000);
    if (recent.length >= 15) return reply(429,{error:'Demasiadas consultas. Intente nuevamente en un minuto.'});
    recent.push(now); requests.set(ip,recent);
    if (requests.size > 10000) for (const [key, times] of requests) if (now-times[times.length-1] >= 60000) requests.delete(key);
    try {
      const upstream = await fetch('https://api.apiperu.pe/api/' + type, {method:'POST', headers:{'Content-Type':'application/json','Accept':'application/json','Authorization':'Bearer '+process.env.APIPERU_TOKEN},body:JSON.stringify({[type]:doc}),signal:AbortSignal.timeout(12000)});
      const body = await upstream.json();
      if (!upstream.ok || !body.success || !body.data) return reply(upstream.status === 429 ? 429 : 502,{error:'No se pudo consultar el documento. Verifique el número o intente nuevamente.'});
      const data = body.data;
      const name = type === 'dni' ? (data.nombre_completo || [data.nombres,data.apellido_paterno,data.apellido_materno].filter(Boolean).join(' ')) : data.nombre_o_razon_social;
      if (!name) return reply(502,{error:'El proveedor no devolvió un nombre.'});
      return reply(200,{name});
    } catch { return reply(502,{error:'No se pudo conectar con el servicio de consulta.'}); }
  }
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('No encontrado');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data)});
}).listen(process.env.PORT || 3000, '0.0.0.0');

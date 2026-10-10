import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.png':'image/png'};
const port = Number(process.env.PORT || 4173);

createServer((req,res)=>{
  let pathname;
  try { pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
  catch {res.writeHead(400);res.end('Bad request');return;}
  const file=path.resolve(root, '.'+pathname.replace(/^\//, '/'));
  if (file!==root && !file.startsWith(root+path.sep)) {res.writeHead(403);res.end('Forbidden');return;}
  const finalFile=pathname==='/'?path.join(root,'index.html'):file;
  try {
    if (!statSync(finalFile).isFile()) throw Error('Not file');
    res.writeHead(200,{'Content-Type':mime[path.extname(finalFile)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    createReadStream(finalFile).pipe(res);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(port,()=>console.log(`Понятно доступно на http://localhost:${port}`));

import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {realpath,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
const args=process.argv.slice(2);
let port=4190;
for(let i=0;i<args.length;i++){
  if(args[i]==='--port')port=Number(args[++i]);
  else if(args[i].startsWith('--port='))port=Number(args[i].slice(7));
  else throw new Error('Usage: node server.mjs [--port 4190]');
}
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid local port.');
const root=await realpath(path.join(path.dirname(fileURLToPath(import.meta.url)),'dist'));
const host='127.0.0.1';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json; charset=utf-8','.woff2':'font/woff2'};
const inside=p=>{const r=path.relative(root,p);return r===''||(!r.startsWith(`..${path.sep}`)&&r!=='..'&&!path.isAbsolute(r));};
const server=http.createServer(async(req,res)=>{
  const reply=(code,message)=>{res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(message);};
  if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return reply(405,'Method not allowed.');}
  try{
    const name=decodeURIComponent(new URL(req.url,`http://${host}:${port}`).pathname).replaceAll('\\','/');
    if(name.includes('\0'))return reply(400,'Invalid path.');
    let file=path.resolve(root,`.${name}`);if(!inside(file))return reply(403,'Access denied.');
    let info=await stat(file);if(info.isDirectory()){file=path.join(file,'index.html');info=await stat(file);}
    const real=await realpath(file);if(!inside(real))return reply(403,'Access denied.');
    if(!info.isFile())return reply(404,'File not found.');
    res.writeHead(200,{'Content-Type':mime[path.extname(real)]||'application/octet-stream','Content-Length':info.size,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin'});
    if(req.method==='HEAD')return res.end();
    const stream=createReadStream(real);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  }catch(e){reply(['ENOENT','ENOTDIR'].includes(e.code)?404:e instanceof URIError?400:500,'Unable to serve the requested path.');}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is in use. Choose another --port.`:e.message);process.exit(1);});
server.listen(port,host,()=>console.log(`CareFlow local deployment: http://${host}:${port}/\nServing dist/ only.`));
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>server.close(()=>process.exit(0)));

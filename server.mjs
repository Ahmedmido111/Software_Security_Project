// Entry point: HTTP server, request pipeline (host check, rate limit, session, CSRF) and routing.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { view } from './views.mjs';
import { root, port, origin } from './config.mjs';
import { digest } from './crypto.mjs';
import { seedDemo } from './seed.mjs';
import { fail, form, activeUser, requireUser, setSecurityHeaders } from './request.mjs';
import * as auth from './auth.mjs';
import * as shop from './shop.mjs';
import * as admin from './admin.mjs';
if(process.argv.includes('--seed-demo')) await seedDemo();
const {sessions,limit,now,sessionFor}=auth;
const post={...auth.post,...shop.post,...admin.post};
const assets=new Map(['/style.css','/ui.js'].map(path=>[path,readFileSync(join(root,'public',path.slice(1)))]));
const authPages=['/login','/register','/confirm'];
const readRoutes=new Set(['/','/product','/cart','/order','/account','/admin',...authPages]);
const writeRoutes=new Set([...authPages,'/logout','/cart','/coupon','/newsletter','/checkout','/account','/admin/product','/admin/coupon','/admin/user']);
const server=http.createServer({requestTimeout:15000,headersTimeout:10000},async(req,res)=>{
  const c={req,res,path:undefined,s:undefined,user:undefined,ip:undefined,f:undefined,q:undefined,flash:undefined};
  c.show=(status,page,context={})=>{
    const html=view(page,{s:c.s,user:c.user,...context});
    res.writeHead(status,{'Content-Type':'text/html; charset=utf-8'}).end(html);
  };
  c.go=(url,message)=>{
    if(message && c.s) c.s.flash=message;
    res.writeHead(303,{Location:url}).end();
  };
  setSecurityHeaders(res);
  try{
    if(req.headers.host!==`127.0.0.1:${port}` || !req.url.startsWith('/') || req.url.startsWith('//')) fail(400,'Invalid request address.');
    const url=new URL(req.url,origin);const path=c.path=url.pathname;
    c.ip=req.socket.remoteAddress;
    limit(`http:${c.ip}`,800,60000);
    if(req.method==='GET' && assets.has(path)) return res.writeHead(200,{'Content-Type':path.endsWith('.css')?'text/css':'text/javascript'}).end(assets.get(path));
    if(!['GET','POST'].includes(req.method)) fail(405,'Unsupported request method.');
    if(!(req.method==='POST'?writeRoutes:readRoutes).has(path)) fail(404,'Page not found.');
    const sid=/(?:^|;\s*)shop=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1];
    if(sid) c.s=sessions.get(digest(sid));
    if(c.s && (c.s.expires<=now() || (c.s.uid && !activeUser(c.s.uid)))){sessions.delete(digest(c.s.id));c.s=null;}
    c.user=activeUser(c.s?.uid);
    if(req.method==='POST'){
      if(!c.s) fail(403,'Your form expired. Reload the page.');
      c.f=await form(req);
      if(sessions.get(digest(c.s.id))!==c.s || c.s.expires<=now() || c.f('_csrf')!==c.s.csrf) fail(403,'Your form could not be verified. Reload the page.');
      c.user=activeUser(c.s.uid);
      if(c.s.uid && !c.user) fail(403,'Your session is inactive.');
      if(path.startsWith('/admin/')) requireUser(c.user,true);
      if(authPages.includes(path) && c.user) return c.go('/account');
      return await post[path](c);
    }
    if(!c.s) c.s=sessionFor(res);
    c.flash=c.s.flash;delete c.s.flash;
    c.q=url.searchParams;
    if(authPages.includes(path)) return c.user?c.go('/account'):c.show(200,path,{flash:c.flash});
    if(shop.pages[path]) return shop.pages[path](c);
    if(!c.user) return c.go('/login','Sign in to continue.');
    if(shop.accountPages[path]) return shop.accountPages[path](c);
    requireUser(c.user,true);
    return admin.page(c);
  }catch(error){
    if(!error.status) console.error(error);
    if(error.status===413){res.setHeader('Connection','close');req.resume();}
    if(!res.headersSent && !res.destroyed) c.show(error.status||500,c.s && authPages.includes(c.path)?c.path:'error',{error:error.status?error.message:'Something went wrong. Try again.',back:writeRoutes.has(c.path)&&['/coupon','/checkout','/cart'].includes(c.path)?'/cart':'/'});
  }
});
server.listen(port,'127.0.0.1',()=>console.log(`SecureShop · ${origin}`));

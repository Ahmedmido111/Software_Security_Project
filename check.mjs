import assert from 'node:assert/strict';
import { mkdtempSync,readdirSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn,spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { DatabaseSync } from 'node:sqlite';
const data=mkdtempSync(join(tmpdir(),'secureshop-'));
const port=process.env.SHOP_TEST_PORT || '4311';
const base=`http://127.0.0.1:${port}`;
const env={...process.env,SHOP_DATA:data,SHOP_PORT:port};
const entry=new URL('./server.mjs',import.meta.url);
const path=decodeURIComponent(entry.pathname).replace(/^\/(?=[A-Za-z]:)/,'');
const seed=spawnSync(process.execPath,[path,'--seed-demo'],{env,encoding:'utf8'});
assert.equal(seed.status,0,seed.stderr);
const [customer,admin]=JSON.parse(readFileSync(join(data,'demo-credentials.json')));
const server=spawn(process.execPath,[path],{env,stdio:['ignore','pipe','inherit']});
const stopped=once(server,'exit');
function client(){
  let cookie='',csrf='';
  return {
    get cookie(){return cookie;},
    async request(path,fields,overrides={}){
      const headers={Cookie:cookie,...overrides};
      if(fields){
        headers.Origin??=base;
        headers['Content-Type']='application/x-www-form-urlencoded';
      }
      const response=await fetch(base+path,{redirect:'manual',headers,method:fields?'POST':'GET',body:fields?new URLSearchParams({_csrf:csrf,...fields}):undefined});
      if(response.headers.has('set-cookie')) cookie=response.headers.get('set-cookie').split(';')[0];
      const html=await response.text();
      csrf=html.match(/name="_csrf" value="([a-f0-9]+)"/)?.[1]||csrf;
      return {status:response.status,html,location:response.headers.get('location'),headers:response.headers};
    },
    async login(account){
      await this.request('/login');
      return this.request('/login',{email:account.email,password:account.password});
    }
  };
}
try{
  let ready=false;
  for(let attempt=0;attempt<40;attempt++){
    try{ready=(await fetch(base)).ok;}catch{}
    if(ready) break;
    if(server.exitCode!==null) break;
    await delay(125);
  }
  assert.ok(ready,'Local server did not start');
  const shopper=client();
  const first=await shopper.request('/');
  assert.equal(first.status,200);
  assert.match(first.html,/Good gear/);
  assert.match(first.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  assert.match(first.headers.get('set-cookie'),/HttpOnly; SameSite=Lax/);
  const search=await shopper.request('/?q=Keyboard&category=Workspace');
  assert.match(search.html,/Field Mechanical Keyboard/);
  assert.doesNotMatch(search.html,/Transit Carry Case/);
  assert.match((await shopper.request('/product?id=1')).html,/Studio 01 Headphones/);
  assert.equal((await shopper.request('/cart',{id:1,quantity:1},{Origin:'http://localhost:1234'})).status,403);
  assert.equal((await shopper.request('/cart',{id:1,quantity:1,_csrf:''})).status,403);
  assert.equal((await shopper.request('/cart',{id:1,quantity:-1})).status,400);
  assert.equal((await shopper.request('/cart',{id:1,quantity:2})).status,303);
  assert.match((await shopper.request('/cart')).html,/6,598.00 EGP/);
  assert.equal((await shopper.request('/cart',{id:1,quantity:0})).status,303);
  assert.match((await shopper.request('/cart')).html,/Your cart is empty/);
  assert.equal((await shopper.request('/cart',{id:1,quantity:1})).status,303);
  const guest=shopper.cookie;
  const unconfirmed={email:'new@secureshop.test',password:'FirstAccount-2026!',name:'Demo Registrant'};
  assert.equal((await shopper.request('/register',unconfirmed)).location,'/confirm');
  assert.equal((await shopper.login(unconfirmed)).status,401);
  const [message]=readdirSync(join(data,'outbox'));
  const token=readFileSync(join(data,'outbox',message),'utf8').match(/Confirmation code: ([a-f0-9]{64})/)[1];
  assert.equal((await shopper.request('/confirm',{token})).location,'/login');
  assert.equal((await shopper.request('/confirm',{token})).status,400);
  assert.equal((await shopper.login(unconfirmed)).location,'/account');
  assert.notEqual(shopper.cookie,guest);
  assert.match((await shopper.request('/cart')).html,/Studio 01 Headphones/);
  assert.equal((await shopper.request('/admin')).status,403);
  assert.equal((await shopper.request('/admin/user',{id:1,active:0})).status,403);
  assert.equal((await shopper.request('/account',{name:'Studio & Workshop'})).status,303);
  assert.match((await shopper.request('/account')).html,/Studio &amp; Workshop/);
  assert.equal((await shopper.request('/newsletter',{})).status,303);
  const personal=(await shopper.request('/account')).html.match(/EDIT-[0-9A-F]{16}/)[0];
  assert.equal((await shopper.request('/newsletter',{})).status,303);
  assert.ok((await shopper.request('/account')).html.includes(personal));
  assert.equal((await shopper.request('/coupon',{code:personal})).status,303);
  const quote=(await shopper.request('/cart')).html.match(/name="quote" value="([^"]+)"/)[1];
  const paid=await shopper.request('/checkout',{quote});
  assert.match(paid.location,/^\/order\?id=\d+$/);
  assert.equal((await shopper.request('/checkout',{quote})).status,400);
  assert.match((await shopper.request(paid.location)).html,/2,969.10 EGP/);
  assert.match((await shopper.request('/account')).html,/12,030.90 EGP/);
  assert.equal((await shopper.request('/coupon',{code:personal})).status,400);
  const other=client();
  assert.equal((await other.login(customer)).status,303);
  assert.equal((await other.request(paid.location)).status,404);
  assert.equal((await other.request('/coupon',{code:personal})).status,400);
  const operator=client();
  assert.equal((await operator.login(admin)).status,303);
  assert.match((await operator.request('/admin')).html,/Recent activity/);
  assert.equal((await operator.request('/admin/product',{name:'New Desk Mat',category:'Workspace',description:'Soft desk mat',price:1000,stock:3,active:1})).status,303);
  assert.match((await other.request('/?q=Desk+Mat')).html,/New Desk Mat/);
  assert.equal((await operator.request('/admin/coupon',{code:'DEMO15',percent:15,active:1})).status,303);
  assert.equal((await other.request('/coupon',{code:'DEMO15'})).status,303);
  assert.equal((await other.request('/cart',{id:1,quantity:10})).status,303);
  const expensive=await other.request('/cart');
  const expensiveQuote=expensive.html.match(/name="quote" value="([^"]+)"/)[1];
  const rejected=await other.request('/checkout',{quote:expensiveQuote});
  assert.equal(rejected.status,409);
  assert.match(rejected.html,/store credit is insufficient/);
  const store=new DatabaseSync(join(data,'shop.sqlite'),{readOnly:true});
  assert.equal(store.prepare('SELECT COUNT(*) AS count FROM orders').get().count,1);
  assert.equal(store.prepare('SELECT stock FROM products WHERE id=1').get().stock,11);
  assert.equal(store.prepare("SELECT COUNT(*) AS count FROM uses WHERE code='DEMO15'").get().count,0);
  const id=store.prepare('SELECT id FROM users WHERE email=?').get(customer.email).id;
  store.close();
  assert.equal((await operator.request('/admin/user',{id,active:0})).status,303);
  assert.equal((await other.request('/account')).location,'/login');
  await shopper.request('/account');
  const old=shopper.cookie;
  assert.equal((await shopper.request('/logout',{})).status,303);
  assert.equal((await shopper.request('/account',undefined,{Cookie:old})).location,'/login');
  const rateCheck=client();
  const invalid={email:'missing@secureshop.test',password:'WrongPassword-123!'};
  for(let attempt=0;attempt<6;attempt++) assert.equal((await rateCheck.login(invalid)).status,401);
  assert.equal((await rateCheck.login(invalid)).status,429);
  console.log('PASS: catalogue, registration and one-time confirmation, cart, coupons, checkout, receipt, account, admin, role and ownership checks, CSRF, logout.');
}finally{
  if(server.exitCode===null) {server.kill();await stopped;}
  rmSync(data,{recursive:true,force:true});
}

// Authentication: sessions, rate limiting, registration, confirmation code, login and logout.
import { timingSafeEqual } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { data, ttl } from './config.mjs';
import { run, get, tx, audit } from './db.mjs';
import { random, digest, derive, hash } from './crypto.mjs';
import { fail, str, email, activeUser } from './request.mjs';
export const sessions=new Map();
const limits=new Map();
export const now=()=>Date.now();
let hashing=0;
setInterval(()=>{
  for(const [key,value] of sessions) if(value.expires<=now()) sessions.delete(key);
  for(const [key,value] of limits) if(value.until<=now()) limits.delete(key);
  run('DELETE FROM tokens WHERE expires<=?',now());
},60000).unref();
export function limit(key,max,window){
  let slot=limits.get(key);
  if(!slot || slot.until<=now()){
    if(limits.size>=10000 && !limits.has(key)) fail(503,'Try again shortly.');
    slot={count:0,until:now()+window};limits.set(key,slot);
  }
  if(slot.count>=max) fail(429,'Too many attempts. Try again later.');
  slot.count++;
}
async function passwordWork(action){
  if(hashing>=4) fail(503,'Sign-in is busy. Try again shortly.');
  hashing++;
  try{return await action();}finally{hashing--;}
}
export function sessionFor(res,uid=null,cart={}){
  if(sessions.size>=2000) fail(503,'Try again shortly.');
  const id=random();
  const value={id,uid,cart,csrf:random(),checkoutNonce:random(),expires:now()+ttl};
  sessions.set(digest(id),value);
  res.setHeader('Set-Cookie',`shop=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1800`);
  return value;
}
const dummy=await hash(random());
export const post={
  '/register':async c=>{
    const {f,ip}=c;
    limit(`register:${ip}`,8,600000);
    const address=email(f('email')),name=str(f('name'),60,'name'),password=f('password');
    if(password.length<12 || password.length>128) fail(400,'Use a password with 12–128 characters.');
    const previous=get('SELECT id,password,verified FROM users WHERE email=?',address);
    const [salt,saved]=(previous?.password||dummy).split(':');
    const encoded=previous
      ? await passwordWork(async()=>timingSafeEqual(await derive(password,salt),Buffer.from(saved,'hex')))
      : await passwordWork(()=>hash(password));
    const token=random();
    tx(()=>{
      let id;
      if(previous){
        if(!encoded || previous.verified || get('SELECT verified FROM users WHERE id=?',previous.id)?.verified) return;
        id=previous.id;
        run('DELETE FROM tokens WHERE uid=?',id);
      }else{
        const result=run('INSERT OR IGNORE INTO users(email,name,password) VALUES (?,?,?)',address,name,encoded);
        if(!result.changes) return;
        id=result.lastInsertRowid;
      }
      run('INSERT INTO tokens VALUES (?,?,?)',digest(token),id,now()+ttl);
      audit(id,previous?'account.confirmation_refreshed':'account.registered');
      writeFileSync(join(data,'outbox',`${token.slice(0,16)}.txt`),`To: ${address}\nConfirmation code: ${token}\nExpires in 30 minutes.\n`,{flag:'wx',mode:0o600});
    });
    return c.go('/confirm','If your registration was accepted, a code is in the local demo outbox.');
  },
  '/confirm':async c=>{
    const {f,ip}=c;
    limit(`confirm:${ip}`,15,600000);
    if(!/^[a-f0-9]{64}$/.test(f('token'))) fail(400,'Enter a valid 64-character confirmation code.');
    tx(()=>{
      const entry=get('SELECT * FROM tokens WHERE hash=? AND expires>?',digest(f('token')),now());
      if(!entry) fail(400,'This confirmation code is invalid or expired.');
      run('UPDATE users SET verified=1 WHERE id=?',entry.uid);
      run('DELETE FROM tokens WHERE hash=?',entry.hash);
      audit(entry.uid,'account.confirmed');
    });
    return c.go('/login','Account confirmed. You can sign in.');
  },
  '/login':async c=>{
    const {f,ip,res}=c;
    const address=email(f('email')),password=f('password');
    limit(`login-ip:${ip}`,30,600000);limit(`login-email:${address}`,6,600000);
    const account=get('SELECT id,password FROM users WHERE email=?',address);
    const [salt,encoded]=(account?.password||dummy).split(':');
    const valid=await passwordWork(async()=>timingSafeEqual(await derive(password.length<=128?password:'',salt),Buffer.from(encoded,'hex')));
    if(!valid || !activeUser(account?.id)){audit(null,'login.denied');fail(401,'Check your credentials and account confirmation.');}
    if(sessions.get(digest(c.s.id))!==c.s || c.s.expires<=now()) fail(403,'Start sign-in again.');
    audit(account.id,'login.succeeded');sessions.delete(digest(c.s.id));c.s=sessionFor(res,account.id,c.s.cart);
    return c.go('/account','Signed in successfully.');
  },
  '/logout':async c=>{
    if(c.user) audit(c.user.id,'logout');
    sessions.delete(digest(c.s.id));
    c.res.setHeader('Set-Cookie','shop=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return c.go('/');
  }
};

// `node server.mjs --seed-demo`: creates the demo customer and admin with random passwords.
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { data } from './config.mjs';
import { get, run } from './db.mjs';
import { hash } from './crypto.mjs';
export async function seedDemo(){
  const credentials=[];
  for(const role of ['customer','admin']){
    const email=`${role}@secureshop.test`;
    if(get('SELECT id FROM users WHERE email=?',email)) continue;
    const password=`Demo-${randomBytes(12).toString('base64url')}!`;
    if(run('INSERT OR IGNORE INTO users(email,name,password,role,verified) VALUES (?,?,?,?,1)',email,role==='admin'?'Store Admin':'Demo Shopper',await hash(password),role).changes) credentials.push({role,email,password});
  }
  if(credentials.length) writeFileSync(join(data,'demo-credentials.json'),JSON.stringify(credentials,null,2),{mode:0o600});
  console.log('Demo credentials are in demo-credentials.json in the data directory.');
  process.exit(0);
}

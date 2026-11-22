// Cryptographic helpers: random tokens, SHA-256 digests and scrypt password hashing.
import { randomBytes, createHash, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
export const random=()=>randomBytes(32).toString('hex');
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const derive=(value,salt)=>promisify(scrypt)(value,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024});
export async function hash(value){
  const salt=randomBytes(16).toString('hex');
  return `${salt}:${(await derive(value,salt)).toString('hex')}`;
}

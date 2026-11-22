// Request hardening: security headers, input validation, form parsing and user/role checks.
import { origin } from './config.mjs';
import { get } from './db.mjs';
export function setSecurityHeaders(res){
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  res.setHeader('Cache-Control','no-store');
}
export function fail(status,message){throw Object.assign(new Error(message),{status});}
export function str(value,max,label){
  value=(value||'').trim();
  if(!value || value.length>max || /[\x00-\x1f\x7f]/.test(value)) fail(400,`Enter a valid ${label}.`);
  return value;
}
export function number(value,min,max,label){
  if(!/^\d{1,10}$/.test(value||'') || Number(value)<min || Number(value)>max) fail(400,`Enter a valid ${label} (${min}–${max}).`);
  return Number(value);
}
export function email(value){
  value=str(value,254,'email address').toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) fail(400,'Enter a valid email address.');
  return value;
}
export function code(value){
  value=str(value,24,'coupon code').toUpperCase();
  if(!/^[A-Z0-9-]{3,24}$/.test(value)) fail(400,'Use 3–24 letters, digits or hyphens for the coupon.');
  return value;
}
export async function form(req){
  if(req.headers.origin!==origin) fail(403,'Request origin could not be verified.');
  if(req.headers['content-type']!=='application/x-www-form-urlencoded') fail(415,'Unsupported form format.');
  const chunks=[];let size=0;
  for await(const chunk of req.iterator({destroyOnReturn:false})){
    size+=chunk.length;
    if(size>8192) fail(413,'Form is too large.');
    chunks.push(chunk);
  }
  const pairs=[...new URLSearchParams(Buffer.concat(chunks).toString())];
  const fields=new Map(pairs);
  if(fields.size!==pairs.length) fail(400,'Duplicate fields.');
  return key=>fields.get(key)||'';
}
export const activeUser=id=>id && get('SELECT id,name,email,role,credit FROM users WHERE id=? AND active=1 AND verified=1',id);
export function requireUser(user,admin=false){
  if(!user) fail(401,'Sign in to continue.');
  if(admin && user.role!=='admin') fail(403,'Administrator access is required.');
}

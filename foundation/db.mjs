// Database layer: SQLite schema, constraints, starter catalogue and query helpers.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { data } from './config.mjs';
mkdirSync(join(data,'outbox'),{recursive:true});
export const db=new DatabaseSync(join(data,'shop.sqlite'));
db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,email TEXT UNIQUE,name TEXT,password TEXT,role TEXT DEFAULT 'customer',verified INTEGER DEFAULT 0,active INTEGER DEFAULT 1,credit INTEGER DEFAULT 1500000 CHECK(credit>=0));
CREATE TABLE IF NOT EXISTS tokens(hash TEXT PRIMARY KEY,uid INTEGER REFERENCES users(id),expires INTEGER);
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY,name TEXT,category TEXT,description TEXT,price INTEGER CHECK(price>0),stock INTEGER CHECK(stock>=0),active INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS coupons(code TEXT PRIMARY KEY,percent INTEGER CHECK(percent BETWEEN 1 AND 50),active INTEGER DEFAULT 1,owner INTEGER UNIQUE REFERENCES users(id));
CREATE TABLE IF NOT EXISTS uses(code TEXT REFERENCES coupons(code),uid INTEGER REFERENCES users(id),PRIMARY KEY(code,uid));
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY,uid INTEGER REFERENCES users(id),total INTEGER,discount INTEGER,items TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,uid INTEGER REFERENCES users(id),event TEXT,created TEXT DEFAULT CURRENT_TIMESTAMP);`);
export const run=(sql,...args)=>db.prepare(sql).run(...args);
export const get=(sql,...args)=>db.prepare(sql).get(...args);
export const all=(sql,...args)=>db.prepare(sql).all(...args);
export const audit=(uid,event)=>run('INSERT INTO audit(uid,event) VALUES (?,?)',uid,event);
export function tx(action){
  db.exec('BEGIN IMMEDIATE');
  try {const result=action();db.exec('COMMIT');return result;}
  catch(error){db.exec('ROLLBACK');throw error;}
}
if(!get('SELECT id FROM products LIMIT 1')) tx(()=>{
  for(const item of [
    ['Studio 01 Headphones','Audio','Balanced, immersive sound with soft over-ear cushions.',329900,12],
    ['Field Mechanical Keyboard','Workspace','A compact mechanical keyboard for focused work.',249900,16],
    ['Orbit Desk Light','Workspace','Adjustable, diffused light for your everyday setup.',119900,18],
    ['Transit Carry Case','Essentials','A structured, lightweight case for your daily kit.',89900,20],
    ['Pocket Speaker','Audio','Portable sound in a minimal, sturdy shell.',149900,12],
    ['Arc Laptop Stand','Essentials','Raise your screen and reclaim your desk space.',99900,10]
  ]) run('INSERT INTO products(name,category,description,price,stock) VALUES (?,?,?,?,?)',...item);
  run("INSERT INTO coupons(code,percent) VALUES ('WELCOME10',10)");
});

// Shop logic: catalogue, cart, coupons, newsletter, account, checkout and receipts.
import { randomBytes } from 'node:crypto';
import { run, get, all, tx, audit } from './db.mjs';
import { random, digest } from './crypto.mjs';
import { fail, str, number, code, requireUser } from './request.mjs';
const product=id=>get('SELECT * FROM products WHERE id=? AND active=1',id);
function eligible(value,id){
  return get(`SELECT * FROM coupons WHERE code=? AND active=1 AND (owner IS NULL OR owner=?)
    AND NOT EXISTS(SELECT 1 FROM uses WHERE code=? AND uid=?)`,value,id,value,id);
}
function basket(s,user){
  const items=Object.entries(s.cart).map(([id,quantity])=>({...get('SELECT * FROM products WHERE id=?',Number(id)),quantity}));
  const coupon=s.coupon && user && eligible(s.coupon,user.id);
  const subtotal=items.reduce((sum,item)=>sum+item.quantity*item.price,0);
  const discount=coupon?Math.floor(subtotal*coupon.percent/100):0;
  const quote=digest(JSON.stringify([s.checkoutNonce,items.map(({id,price,quantity})=>[id,price,quantity]),coupon?.code,coupon?.percent]));
  return {items,coupon,subtotal,discount,total:subtotal-discount,quote};
}
export const post={
  '/cart':async c=>{
    const {s,f,go}=c;
    const id=number(f('id'),1,2147483647,'product ID'),quantity=number(f('quantity'),0,20,'quantity');
    if(!quantity) delete s.cart[id];
    else{
      if(quantity>(product(id)?.stock||0)) fail(409,'That quantity is unavailable.');
      if(!s.cart[id] && Object.keys(s.cart).length>=30) fail(400,'Your cart supports 30 different products.');
      s.cart[id]=quantity;
    }
    return go('/cart',quantity?'Cart updated.':'Item removed.');
  },
  '/coupon':async c=>{
    const {s,f,go,user}=c;
    requireUser(user);
    if(!f('code').trim()){delete s.coupon;return go('/cart','Coupon removed.');}
    const coupon=eligible(code(f('code')),user.id);
    if(!coupon) fail(400,'This coupon is unavailable for your account.');
    s.coupon=coupon.code;
    return go('/cart','Coupon applied.');
  },
  '/newsletter':async c=>{
    const {go,user}=c;
    requireUser(user);
    tx(()=>{
      if(get('SELECT code FROM coupons WHERE owner=?',user.id)) return;
      run('INSERT INTO coupons(code,percent,owner) VALUES (?,10,?)',`EDIT-${randomBytes(8).toString('hex').toUpperCase()}`,user.id);
      audit(user.id,'newsletter.subscribed');
    });
    return go('/account','Your private coupon is ready.');
  },
  '/account':async c=>{
    const {f,go,user}=c;
    requireUser(user);
    tx(()=>{run('UPDATE users SET name=? WHERE id=?',str(f('name'),60,'name'),user.id);audit(user.id,'profile.updated');});
    return go('/account','Profile saved.');
  },
  '/checkout':async c=>{
    const {s,f,go,user}=c;
    requireUser(user);
    const id=tx(()=>{
      const {items,total,discount,coupon,quote}=basket(s,user);
      if(!items.length) fail(400,'Add an item before checkout.');
      if(s.coupon && !coupon) fail(409,'This coupon is unavailable. Remove it to continue.');
      if(f('quote')!==quote) fail(409,'Review the updated cart before paying.');
      for(const item of items) if(!run('UPDATE products SET stock=stock-? WHERE id=? AND active=1 AND stock>=?',item.quantity,item.id,item.quantity).changes) fail(409,'Stock changed. Update your cart.');
      if(!run('UPDATE users SET credit=credit-? WHERE id=? AND credit>=?',total,user.id,total).changes) fail(409,'Your store credit is insufficient.');
      if(coupon) run('INSERT INTO uses VALUES (?,?)',coupon.code,user.id);
      const result=run('INSERT INTO orders(uid,total,discount,items) VALUES (?,?,?,?)',user.id,total,discount,JSON.stringify(items.map(({name,quantity,price})=>({name,quantity,price}))));
      audit(user.id,'order.placed');return result.lastInsertRowid;
    });
    s.cart={};s.checkoutNonce=random();delete s.coupon;
    return go(`/order?id=${id}`,'Order placed successfully.');
  }
};
// Public pages (no sign-in needed).
export const pages={
  '/':c=>{
    const {q,flash,show,path}=c;
    const search=(q.get('q')||'').trim().slice(0,80),category=(q.get('category')||'').slice(0,32);
    const products=all(`SELECT * FROM products WHERE active=1 AND (?='' OR category=?) AND
      (instr(lower(name),lower(?))>0 OR instr(lower(description),lower(?))>0) ORDER BY id LIMIT 100`,category,category,search,search);
    return show(200,path,{products,search,category,categories:all('SELECT DISTINCT category FROM products WHERE active=1 ORDER BY category'),flash});
  },
  '/product':c=>{
    const {q,flash,show,path}=c;
    const item=product(number(q.get('id'),1,2147483647,'product ID'));
    if(!item) fail(404,'Product not found.');
    return show(200,path,{item,flash});
  },
  '/cart':c=>c.show(200,c.path,{...basket(c.s,c.user),flash:c.flash})
};
// Pages that need a signed-in customer.
export const accountPages={
  '/account':c=>c.show(200,c.path,{orders:all('SELECT * FROM orders WHERE uid=? ORDER BY id DESC',c.user.id),coupon:get('SELECT code FROM coupons WHERE owner=?',c.user.id),flash:c.flash}),
  '/order':c=>{
    const order=get('SELECT * FROM orders WHERE id=? AND uid=?',number(c.q.get('id'),1,2147483647,'order ID'),c.user.id);
    if(!order) fail(404,'Order not found.');
    return c.show(200,c.path,{order,flash:c.flash});
  }
};

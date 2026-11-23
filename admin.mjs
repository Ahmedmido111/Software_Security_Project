// Administration: product, coupon and customer management, plus the admin dashboard page.
import { run, all, tx, audit } from './db.mjs';
import { fail, str, number, code } from './request.mjs';
import { sessions } from './auth.mjs';
export const post={
  '/admin/product':async c=>{
    const {f,go,user}=c;
    const values=[str(f('name'),80,'product name'),str(f('category'),32,'category'),str(f('description'),300,'description'),number(f('price'),1,100000000,'price in piastres'),number(f('stock'),0,100000,'stock'),f('active')==='1'?1:0];
    tx(()=>{
      if(f('id')){
        if(!run('UPDATE products SET name=?,category=?,description=?,price=?,stock=?,active=? WHERE id=?',...values,number(f('id'),1,2147483647,'product ID')).changes) fail(404,'Product not found.');
      }else run('INSERT INTO products(name,category,description,price,stock,active) VALUES (?,?,?,?,?,?)',...values);
      audit(user.id,'admin.product.saved');
    });
    return go('/admin','Product saved.');
  },
  '/admin/coupon':async c=>{
    const {f,go,user}=c;
    tx(()=>{
      if(!run(`INSERT INTO coupons(code,percent,active) VALUES (?,?,?) ON CONFLICT(code)
        DO UPDATE SET percent=excluded.percent,active=excluded.active WHERE owner IS NULL`,
        code(f('code')),number(f('percent'),1,50,'discount'),f('active')==='1'?1:0).changes) fail(409,'Choose a public coupon.');
      audit(user.id,'admin.coupon.saved');
    });
    return go('/admin#coupons','Coupon saved.');
  },
  '/admin/user':async c=>{
    const {f,go,user}=c;
    const id=number(f('id'),1,2147483647,'customer ID'),active=f('active')==='1'?1:0;
    tx(()=>{
      if(!run("UPDATE users SET active=? WHERE id=? AND role='customer'",active,id).changes) fail(404,'Customer not found.');
      audit(user.id,'admin.customer.status_changed');
    });
    if(!active) for(const [key,entry] of sessions) if(entry.uid===id) sessions.delete(key);
    return go('/admin#users','Customer status saved.');
  }
};
export const page=c=>c.show(200,c.path,{products:all('SELECT * FROM products ORDER BY id'),coupons:all('SELECT * FROM coupons WHERE owner IS NULL ORDER BY code'),customers:all("SELECT id,name,email,active,verified FROM users WHERE role='customer' ORDER BY id"),events:all('SELECT * FROM audit ORDER BY id DESC LIMIT 15'),flash:c.flash});

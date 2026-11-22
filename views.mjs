const e=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>`${new Intl.NumberFormat('en-EG',{minimumFractionDigits:2}).format(value/100)} EGP`;
const hidden=(name,value)=>`<input type="hidden" name="${name}" value="${e(value)}">`;
const field=(title,name,opts='',value='')=>`<label>${title}<input name="${name}" ${opts} value="${e(value)}"></label>`;
const button=(label,kind='primary')=>`<button class="button ${kind}" type="submit">${label}</button>`;
const link=(url,label,kind='secondary')=>`<a href="${url}" class="button ${kind}">${label}</a>`;
const art=(id,hero=false)=>`<div class="art art-${hero?1:((id-1)%6)+1}" aria-hidden="true"><div class="drawing"><i></i><b></b><span></span></div></div>`;
const stock=p=>p.stock && p.active?'In stock':'Unavailable';
const statusField=active=>`<label>Status<select name="active"><option value="1" ${active?'selected':''}>Active</option><option value="0" ${active?'':'selected'}>Inactive</option></select></label>`;
export function view(page,c){
  const {s,user,flash,error}=c;
  const form=(action,inside,classes='')=>`<form method="post" action="${action}" class="${classes}">${hidden('_csrf',s?.csrf||'')}${inside}</form>`;
  const itemForm=(p,quantity=1)=>form('/cart',hidden('id',p.id)+field('Quantity','quantity',`type="number" min="1" max="${Math.min(p.stock,20)}" required`,quantity)+button('Add to cart'),'inline');
  const note=error?`<div class="notice error" role="alert">${e(error)}</div>`:flash?`<div class="notice" role="status">${e(flash)}</div>`:'';
  const heading=(tag,title,subtitle='')=>`<div class="page-head"><span class="eyebrow">${tag}</span><h1>${title}</h1>${subtitle?`<p>${subtitle}</p>`:''}</div>`;
  let main='',title='SecureShop';
  if(page==='/'){
    const {products,search,category,categories}=c;
    main=`<section class="hero"><div class="hero-copy"><span class="eyebrow">THE SECURESHOP EDIT</span><h1>Good gear.<br><em>Better days.</em></h1><p>Considered essentials for the space where you work, play and create.</p>${link('#catalogue','Explore the collection','light')}</div><div class="hero-art">${art(1,true)}<span>STUDIO 01 / AUDIO</span></div></section>
      <section id="catalogue" class="catalogue"><div class="section-head"><div><h2>Shop the collection</h2><p>${products.length} ${products.length===1?'product':'products'}</p></div>
      <form action="/#catalogue" method="get" class="search"><label><span class="sr-only">Search products</span><input name="q" type="search" maxlength="80" placeholder="Search products" value="${e(search)}"></label><label><span class="sr-only">Category</span><select name="category"><option value="">All categories</option>${categories.map(({category:name})=>`<option ${category===name?'selected':''} value="${e(name)}">${e(name)}</option>`).join('')}</select></label>${button('Filter','secondary')}</form></div>
      <div class="cards">${products.map(p=>`<article class="card"><a href="/product?id=${p.id}" aria-label="View ${e(p.name)}">${art(p.id)}</a><div class="card-body"><span class="eyebrow">${e(p.category)}</span><h3><a href="/product?id=${p.id}">${e(p.name)}</a></h3><div class="spread"><strong>${money(p.price)}</strong><span class="stock">${stock(p)}</span></div></div></article>`).join('')||'<p>No products match these filters.</p>'}</div></section>`;
  }else if(page==='/product'){
    const p=c.item;title=p.name;
    main=`<a class="back" href="/#catalogue">Back to collection</a><section class="detail">${art(p.id)}<div class="panel detail-copy">${heading(e(p.category),e(p.name),e(p.description))}<p class="price">${money(p.price)}</p><p>${p.stock?`${p.stock} in stock`:'Out of stock'}</p>${p.stock?itemForm(p,s.cart[p.id]||1):''}</div></section>`;
  }else if(['/login','/register','/confirm'].includes(page)){
    const details={
      '/login':['Welcome back','Sign in','Enter your email and password.',field('Email address','email','type="email" maxlength="254" autocomplete="email" required')+field('Password','password','type="password" maxlength="128" autocomplete="current-password" required'),'<a href="/register">Create an account</a>'],
      '/register':['Your store account','Create an account','Start with 15,000.00 EGP in demo store credit.',field('Full name','name','maxlength="60" autocomplete="name" required')+field('Email address','email','type="email" maxlength="254" autocomplete="email" required')+field('Password (12–128 characters)','password','type="password" minlength="12" maxlength="128" autocomplete="new-password" required'),'<a href="/login">Already registered? Sign in</a>'],
      '/confirm':['Account verification','Confirm your account','Copy the code from the local demo outbox. It expires after 30 minutes.',field('Confirmation code','token','minlength="64" maxlength="64" autocomplete="off" spellcheck="false" required'),'<a href="/login">Return to sign in</a>']
    }[page];
    title=details[1];
    main=`<div class="auth"><aside class="auth-art"><span class="eyebrow">SECURESHOP</span>${art(1,true)}<p>Essentials for your everyday.</p></aside><section class="panel auth-panel">${heading(...details.slice(0,3))}${note}${form(page,details[3]+button(details[1]),'stack')}${details[4]}</section></div>`;
  }else if(page==='/cart'){
    title='Your cart';
    main=heading('Checkout','Your cart')+`<div class="split"><section class="panel"><h2>Items</h2>${c.items.map(p=>`<div class="row"><div><strong>${e(p.name)}</strong><p>${money(p.price)} each${!p.active?' · No longer available':''}</p></div>${form('/cart',hidden('id',p.id)+field('Quantity','quantity','type="number" min="1" max="20" required',p.quantity)+button('Update','secondary'),'inline')}${form('/cart',hidden('id',p.id)+hidden('quantity',0)+button('Remove','quiet'))}</div>`).join('')||`<p>Your cart is empty.</p>${link('/#catalogue','Explore the collection')}`}</section>
    <section class="panel"><h2>Order summary</h2><dl class="totals"><div><dt>Subtotal</dt><dd>${money(c.subtotal)}</dd></div><div><dt>Discount</dt><dd>${money(c.discount)}</dd></div><div class="sum"><dt>Total</dt><dd>${money(c.total)}</dd></div></dl>
    ${user?`<p>Available credit <strong>${money(user.credit)}</strong></p>${form('/coupon',field('Coupon code','code','maxlength="24"',s.coupon||'')+button('Apply','secondary'),'inline')}${s.coupon?form('/coupon',button('Remove coupon','quiet')):''}${c.items.length?form('/checkout',hidden('quote',c.quote)+button('Pay with store credit'),'pay'):''}`:link('/login','Sign in to check out','primary')}</section></div>`;
  }else if(page==='/account'){
    title='Your account';
    main=heading('Account',`Hello, ${e(user.name)}`,`Available store credit · ${money(user.credit)}`)+`<div class="split"><section class="panel"><h2>Order history</h2>${c.orders.map(o=>`<a class="row spread" href="/order?id=${o.id}"><span><strong>Order #${o.id}</strong><small>${e(o.created)} UTC</small></span><strong>${money(o.total)}</strong></a>`).join('')||'<p>Your orders will appear here.</p>'}</section><div class="stack"><section class="panel"><h2>Profile</h2><p>${e(user.email)}</p>${form('/account',field('Display name','name','maxlength="60" required',user.name)+button('Save profile'),'stack')}</section><section class="panel"><h2>The newsletter</h2>${c.coupon?`<p>Your personal 10% coupon</p><code>${e(c.coupon.code)}</code>`:`<p>Subscribe to receive a personal 10% coupon.</p>${form('/newsletter',button('Subscribe','secondary'))}`}</section></div></div>`;
  }else if(page==='/order'){
    const o=c.order;title=`Order #${o.id}`;
    main=heading('Order confirmation',title,`Paid with store credit · ${e(o.created)} UTC`)+`<section class="panel receipt"><h2>Receipt</h2>${JSON.parse(o.items).map(p=>`<div class="row spread"><span>${p.quantity} × ${e(p.name)}</span><strong>${money(p.price*p.quantity)}</strong></div>`).join('')}<dl class="totals"><div><dt>Discount</dt><dd>${money(o.discount)}</dd></div><div class="sum"><dt>Paid</dt><dd>${money(o.total)}</dd></div></dl>${link('/account','View order history')}</section>`;
  }else if(page==='/admin'){
    title='Store administration';
    const productEditor=(p={active:1})=>form('/admin/product',hidden('id',p.id)+field('Product name','name','maxlength="80" required',p.name)+field('Category','category','maxlength="32" required',p.category)+field('Description','description','maxlength="300" required',p.description)+field('Price (piastres)','price','type="number" min="1" max="100000000" required',p.price)+field('Stock','stock','type="number" min="0" max="100000" required',p.stock)+statusField(p.active)+button(p.id?'Save product':'Create product'),'editor');
    const couponEditor=(p={active:1})=>form('/admin/coupon',field('Coupon code','code',`maxlength="24" required ${p.code?'readonly':''}`,p.code)+field('Discount (%)','percent','type="number" min="1" max="50" required',p.percent)+statusField(p.active)+button('Save coupon'),'editor');
    main=heading('Administration','Store administration')+`<div class="admin-menu">${link('#products','Products')}${link('#coupons','Coupons')}${link('#users','Customers')}${link('#activity','Activity')}</div>
    <div class="stack"><section class="panel" id="products"><h2>Products</h2><details><summary>Add product</summary>${productEditor()}</details>${c.products.map(p=>`<details><summary>${e(p.name)} · ${money(p.price)}</summary>${productEditor(p)}</details>`).join('')}</section>
    <section class="panel" id="coupons"><h2>Public coupons</h2><details><summary>Add coupon</summary>${couponEditor()}</details>${c.coupons.map(p=>`<details><summary>${e(p.code)} · ${p.percent}%</summary>${couponEditor(p)}</details>`).join('')}</section>
    <section class="panel" id="users"><h2>Customers</h2>${c.customers.map(u=>`<div class="row spread"><div><strong>${e(u.name)}</strong><small>${e(u.email)} · ${u.verified?'Confirmed':'Unconfirmed'} · ${u.active?'Active':'Suspended'}</small></div>${form('/admin/user',hidden('id',u.id)+hidden('active',u.active?0:1)+button(u.active?'Suspend':'Reactivate','secondary'))}</div>`).join('')||'<p>No customers yet.</p>'}</section>
    <section class="panel" id="activity"><h2>Recent activity</h2>${c.events.map(a=>`<div class="row spread"><code>${e(a.event)}</code><small>${e(a.created)} UTC · ${a.uid?`User ${a.uid}`:'Anonymous'}</small></div>`).join('')||'<p>No events yet.</p>'}</section></div>`;
  }else{
    title='Request unavailable';
    main=`<section class="panel receipt">${heading('SecureShop','Request unavailable')}${note}${link(c.back||'/','Go back')}</section>`;
  }
  const count=Object.values(s?.cart||{}).reduce((a,b)=>a+b,0);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${e(title)}${page==='/'?'':' · SecureShop'}</title><link rel="stylesheet" href="/style.css"><script defer src="/ui.js"></script></head><body>
  <a class="skip" href="#main">Skip to content</a><header><nav class="shell nav" aria-label="Main navigation"><a class="brand" href="/"><span class="mark" aria-hidden="true">S</span>SecureShop</a><div class="nav-links"><a href="/#catalogue">Shop</a>${user?`<a href="/account">Account</a>${user.role==='admin'?'<a href="/admin">Admin</a>':''}${form('/logout',button('Sign out','quiet'))}`:'<a href="/login">Sign in</a>'}<a class="cart-link" href="/cart">Cart <strong>${count}</strong></a></div></nav></header>
  <main id="main" class="shell">${page==='error'||['/login','/register','/confirm'].includes(page)?'':note}${main}</main><footer class="shell"><span class="brand">SecureShop</span><span>CET431 · Store credit demo</span></footer></body></html>`;
}
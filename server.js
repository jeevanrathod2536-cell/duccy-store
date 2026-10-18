// Duccy store backend. Env: ADMIN_PASSWORD, TOKEN_SECRET, SITE_URL (optional), DATA_FILE (optional)
const express = require('express'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '50kb' }));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD, TOKEN_SECRET = process.env.TOKEN_SECRET;
if (!ADMIN_PASSWORD || !TOKEN_SECRET || TOKEN_SECRET.length < 16) { console.error('Set ADMIN_PASSWORD and TOKEN_SECRET (16+ chars) env vars'); process.exit(1); }
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'store.json');
const FREE_ABOVE = 699, SHIP_FEE = 59, STATUSES = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];
const products = Object.fromEntries(JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'))).map(p => [p.id, p]));

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
let db = { orders: [] };
try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) {}
const save = () => { fs.writeFileSync(DATA_FILE + '.tmp', JSON.stringify(db)); fs.renameSync(DATA_FILE + '.tmp', DATA_FILE); };

// simple rate limiter
const hits = new Map();
const limit = (name, max, ms) => (req, res, next) => {
  const k = name + req.ip, now = Date.now(), arr = (hits.get(k) || []).filter(t => now - t < ms);
  if (arr.length >= max) return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  arr.push(now); hits.set(k, arr); next();
};
const eq = (a, b) => { const x = crypto.createHash('sha256').update(String(a)).digest(), y = crypto.createHash('sha256').update(String(b)).digest(); return crypto.timingSafeEqual(x, y); };
const sign = s => crypto.createHmac('sha256', TOKEN_SECRET).update(s).digest('hex');
const makeToken = () => { const exp = Date.now() + 12 * 3600e3; return exp + '.' + sign('admin.' + exp); };
const auth = (req, res, next) => {
  const [exp, sig] = (req.headers.authorization || '').replace('Bearer ', '').split('.');
  if (!exp || !sig || Date.now() > +exp || !eq(sig, sign('admin.' + exp))) return res.status(401).json({ error: 'Please sign in again' });
  next();
};
const txt = (v, max) => String(v ?? '').trim().slice(0, max);

app.post('/api/orders', limit('order', 10, 3600e3), (req, res) => {
  const b = req.body || {}, c = b.customer || {};
  const customer = { name: txt(c.name, 80), phone: txt(c.phone, 10), address: txt(c.address, 250), city: txt(c.city, 60), pin: txt(c.pin, 6) };
  if (customer.name.length < 2 || !/^[6-9]\d{9}$/.test(customer.phone) || customer.address.length < 8 || !customer.city || !/^\d{6}$/.test(customer.pin))
    return res.status(400).json({ error: 'Please check name, phone, address, city and PIN code' });
  if (!Array.isArray(b.items) || !b.items.length || b.items.length > 30) return res.status(400).json({ error: 'Cart is empty' });
  const items = [];
  for (const i of b.items) {
    const p = products[i.productId], q = Number(i.quantity);
    if (!p || !Number.isInteger(q) || q < 1 || q > 10) return res.status(400).json({ error: 'Invalid item in cart' });
    items.push({ productId: p.id, name: p.name, price: p.price, quantity: q, size: txt(i.size, 20), color: txt(i.color, 20) });
  }
  const sub = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const coupon = txt(b.coupon, 20).toUpperCase() === 'WELCOME10' ? 'WELCOME10' : '';
  const discount = coupon ? Math.round(sub * 0.1) : 0, shipping = sub - discount >= FREE_ABOVE ? 0 : SHIP_FEE;
  const order = { id: 'DUC' + crypto.randomInt(1000000, 9999999), createdAt: new Date().toISOString(), customer, items, subtotal: sub, discount, coupon, shipping, total: sub - discount + shipping, paymentMethod: 'COD', status: 'Pending' };
  db.orders.push(order); save();
  res.json({ order: { id: order.id, total: order.total } });
});

app.post('/api/admin/login', limit('login', 10, 15 * 60e3), (req, res) => {
  if (!eq(req.body && req.body.password, ADMIN_PASSWORD)) return res.status(401).json({ error: 'Wrong password' });
  res.json({ token: makeToken() });
});
app.get('/api/admin/orders', auth, (req, res) => res.json({ orders: [...db.orders].reverse() }));
app.patch('/api/admin/orders/:id', auth, (req, res) => {
  const o = db.orders.find(o => o.id === req.params.id), s = req.body && req.body.status;
  if (!o) return res.status(404).json({ error: 'Order not found' });
  if (!STATUSES.includes(s)) return res.status(400).json({ error: 'Invalid status' });
  o.status = s; save(); res.json({ order: o });
});

// pages (explicit routes so server files are never exposed)
const page = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
app.get(['/', '/index.html'], (req, res) => res.type('html').send(page('index.html').replaceAll('__SITE_URL__', SITE_URL)));
app.get('/admin.html', (req, res) => res.type('html').set('X-Robots-Tag', 'noindex').send(page('admin.html')));
app.get('/robots.txt', (req, res) => res.type('text').send('User-agent: *\nAllow: /\nDisallow: /admin.html\nDisallow: /api/\n' + (SITE_URL ? 'Sitemap: ' + SITE_URL + '/sitemap.xml\n' : '')));
app.get('/sitemap.xml', (req, res) => res.type('xml').send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' + SITE_URL + '/</loc></url></urlset>'));
app.use((req, res) => res.status(404).type('html').send('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found — Duccy</title><body style="font-family:Arial;text-align:center;padding:60px 20px"><h1 style="color:#ff4f8b">404</h1><p>Ye page nahi mila.</p><a href="/" style="color:#ff4f8b">← Duccy home</a></body>'));
app.listen(process.env.PORT || 3000, () => console.log('Duccy running'));

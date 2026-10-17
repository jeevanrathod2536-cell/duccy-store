const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const TOKEN_SECRET = process.env.TOKEN_SECRET;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'store.json');
if (!ADMIN_PASSWORD || !TOKEN_SECRET) {
  console.warn('WARNING: Set ADMIN_PASSWORD and TOKEN_SECRET environment variables before production use.');
}
app.use(express.json({limit:'100kb'}));
app.use(express.static(path.join(__dirname,'public')));

function ensureData(){
  fs.mkdirSync(path.dirname(DATA_FILE),{recursive:true});
  if(!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({orders:[]},null,2));
}
function readData(){ensureData();try{return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'))}catch(e){return {orders:[]}}}
function writeData(data){ensureData();fs.writeFileSync(DATA_FILE,JSON.stringify(data,null,2))}
function signToken(payload){const body=Buffer.from(JSON.stringify(payload)).toString('base64url');const sig=crypto.createHmac('sha256',TOKEN_SECRET||'local-dev-only').update(body).digest('base64url');return body+'.'+sig}
function auth(req,res,next){
  const raw=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');const parts=raw.split('.');
  if(parts.length!==2)return res.status(401).json({error:'Admin sign-in required'});
  const expected=crypto.createHmac('sha256',TOKEN_SECRET||'local-dev-only').update(parts[0]).digest('base64url');
  if(!crypto.timingSafeEqual(Buffer.from(parts[1]),Buffer.from(expected)))return res.status(401).json({error:'Invalid admin session'});
  let p;try{p=JSON.parse(Buffer.from(parts[0],'base64url').toString())}catch(e){return res.status(401).json({error:'Invalid admin session'})}
  if(!p.exp||p.exp<Date.now())return res.status(401).json({error:'Admin session expired'});
  next();
}
app.post('/api/admin/login',(req,res)=>{
  if(!ADMIN_PASSWORD||!TOKEN_SECRET)return res.status(503).json({error:'Admin is not configured. Set ADMIN_PASSWORD and TOKEN_SECRET.'});
  const password=String(req.body.password||'');
  const a=Buffer.from(password),b=Buffer.from(ADMIN_PASSWORD);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(401).json({error:'Incorrect password'});
  res.json({token:signToken({exp:Date.now()+8*60*60*1000})});
});
app.post('/api/orders',(req,res)=>{
  const body=req.body||{},c=body.customer||{},items=body.items;
  if(!c.name||!/^([6-9]\d{9})$/.test(String(c.phone||''))||!c.address||!c.city||!/^(\d{6})$/.test(String(c.pin||'')))return res.status(400).json({error:'Please provide valid delivery details'});
  if(!Array.isArray(items)||!items.length)return res.status(400).json({error:'Your cart is empty'});
  if(!['COD','ONLINE_PAID'].includes(body.paymentMethod))return res.status(400).json({error:'Select a valid payment method'});
  let total=0;
  const cleanItems=[];
  for(const i of items){
    const price=Number(i.price),quantity=Number(i.quantity);
    if(!i.name||!Number.isFinite(price)||price<0||!Number.isInteger(quantity)||quantity<1||quantity>20)return res.status(400).json({error:'Invalid cart item'});
    total+=price*quantity;cleanItems.push({productId:Number(i.productId)||null,name:String(i.name).slice(0,120),price,quantity,size:String(i.size||'').slice(0,20),color:String(i.color||'').slice(0,30)});
  }
  const data=readData();
  const order={id:'DUC'+Date.now().toString().slice(-8),createdAt:new Date().toISOString(),customer:{name:String(c.name).slice(0,100),phone:String(c.phone),address:String(c.address).slice(0,300),city:String(c.city).slice(0,100),pin:String(c.pin)},paymentMethod:body.paymentMethod,total,items:cleanItems,status:'Pending'};
  data.orders.unshift(order);writeData(data);
  res.status(201).json({order:{id:order.id,status:order.status}});
});

// Razorpay Checkout integration. Configure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
// in the hosting provider's server-side environment variables. Never expose the secret to the browser.
app.post('/api/payments/razorpay/order', async (req,res)=>{
  const keyId=process.env.RAZORPAY_KEY_ID, keySecret=process.env.RAZORPAY_KEY_SECRET;
  if(!keyId||!keySecret)return res.status(503).json({error:'Online payments are not configured yet. Store owner must add Razorpay keys on the server.'});
  const amount=Number(req.body.amount);
  if(!Number.isInteger(amount)||amount<1||amount>50000000)return res.status(400).json({error:'Invalid payment amount'});
  try{
    const auth=Buffer.from(keyId+':'+keySecret).toString('base64');
    const response=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{'Authorization':'Basic '+auth,'Content-Type':'application/json'},body:JSON.stringify({amount,currency:'INR',receipt:'duc_'+Date.now().toString().slice(-10),notes:{store:'Duccy'}})});
    const data=await response.json();
    if(!response.ok)return res.status(502).json({error:data.error?.description||'Payment provider order creation failed'});
    res.json({keyId,orderId:data.id,amount:data.amount,currency:data.currency});
  }catch(e){res.status(502).json({error:'Could not connect to payment provider'});}
});
app.post('/api/payments/razorpay/verify',(req,res)=>{
  const secret=process.env.RAZORPAY_KEY_SECRET;
  if(!secret)return res.status(503).json({error:'Payments are not configured'});
  const {razorpay_order_id,razorpay_payment_id,razorpay_signature}=req.body||{};
  if(!razorpay_order_id||!razorpay_payment_id||!razorpay_signature)return res.status(400).json({error:'Missing payment verification fields'});
  const expected=crypto.createHmac('sha256',secret).update(razorpay_order_id+'|'+razorpay_payment_id).digest('hex');
  const a=Buffer.from(String(expected)),b=Buffer.from(String(razorpay_signature));
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(400).json({error:'Payment signature verification failed'});
  res.json({verified:true,paymentId:razorpay_payment_id});
});

app.get('/api/admin/orders',auth,(req,res)=>res.json({orders:readData().orders}));
app.patch('/api/admin/orders/:id',auth,(req,res)=>{
  const allowed=['Pending','Confirmed','Packed','Shipped','Delivered','Cancelled'];const status=String(req.body.status||'');
  if(!allowed.includes(status))return res.status(400).json({error:'Invalid order status'});
  const data=readData();const order=data.orders.find(o=>o.id===req.params.id);
  if(!order)return res.status(404).json({error:'Order not found'});
  order.status=status;order.updatedAt=new Date().toISOString();writeData(data);res.json({order:{id:order.id,status:order.status}});
});
app.get('/api/health',(req,res)=>res.json({ok:true,service:'Duccy Store API'}));
app.listen(PORT,()=>console.log(`Duccy store running on port ${PORT}`));

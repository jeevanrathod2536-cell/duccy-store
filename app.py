import os, sqlite3, uuid
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory
app = Flask(__name__, static_folder="public", static_url_path="")
DB = os.environ.get("DATABASE_PATH", "duccy.db")
CATEGORIES = ["T-Shirts", "Oversized", "Hoodies", "Bottom Wear", "Shirts", "Dresses", "Co-ords", "Jackets"]
NAMES = ["Crown Graphic Tee", "Story Oversized Tee", "Essential Hoodie", "Cargo Pants", "Everyday Shirt", "Weekend Dress", "Lounge Co-ord Set", "Streetwear Jacket"]
COLORS = ["Black", "White", "Pink"]
def connection():
    db = sqlite3.connect(DB)
    db.row_factory = sqlite3.Row
    return db
with connection() as db:
    db.executescript("""CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, name TEXT, category TEXT, price INTEGER, color TEXT, art TEXT); CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY, total INTEGER, created TEXT DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS order_items(order_id TEXT, product_id INTEGER, size TEXT, quantity INTEGER, unit_price INTEGER);""")
    if not db.execute("SELECT COUNT(*) FROM products").fetchone()[0]:
        for i, category in enumerate(CATEGORIES):
            for j, color in enumerate(COLORS):
                db.execute("INSERT INTO products(name,category,price,color,art) VALUES(?,?,?,?,?)", (NAMES[i],category,[599,699,999,899,799,1199,1499,1799][i],color,["tee","tee","hoodie","pants","shirt","dress","coord","jacket"][i]))
@app.get("/")
def home():
    return app.send_static_file("index.html")
@app.get("/api/products")
def products():
    with connection() as db:
        return jsonify([dict(row) for row in db.execute("SELECT * FROM products")])
@app.post("/api/orders")
def order():
    data = request.get_json(silent=True)
    if not isinstance(data,dict) or not isinstance(data.get("items"),list) or not 1 <= len(data["items"]) <= 100:
        return jsonify(error="Please add items to your cart."),400
    validated=[]
    total=0
    with connection() as db:
        for item in data["items"]:
            if not isinstance(item,dict): return jsonify(error="Invalid cart item"),400
            pid, qty, size = item.get("id"), item.get("quantity"), item.get("size")
            if type(pid) is not int or type(qty) is not int or not 1 <= qty <= 10 or size not in ["XS","S","M","L","XL","XXL"]:
                return jsonify(error="Invalid product, size or quantity (maximum 10)."),400
            product=db.execute("SELECT * FROM products WHERE id=?",(pid,)).fetchone()
            if not product: return jsonify(error="Product unavailable"),400
            total+=product["price"]*qty
            validated.append((pid,size,qty,product["price"]))
        discount=total//10 if data.get("coupon","").strip().upper()=="DUCCY10" else 0
        shipping=0 if total>=699 else 49
        oid="DUC-"+uuid.uuid4().hex[:12].upper()
        db.execute("INSERT INTO orders(id,total) VALUES(?,?)",(oid,total-discount+shipping))
        db.executemany("INSERT INTO order_items VALUES(?,?,?,?,?)",[(oid,*v) for v in validated])
    return jsonify(id=oid,subtotal=total,discount=discount,shipping=shipping,total=total-discount+shipping,demo=True),201
@app.after_request
def headers(response):
    response.headers["X-Content-Type-Options"]="nosniff"
    response.headers["Referrer-Policy"]="strict-origin-when-cross-origin"
    return response
if __name__=="__main__":
    app.run(host="0.0.0.0",port=int(os.environ.get("PORT",5000)),debug=False)

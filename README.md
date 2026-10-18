# Duccy — full-stack clothing demo

Pink-and-white responsive clothing shop inspired by the supplied reference. Original SVG placeholder clothing illustrations, not the reference photos. 24 products across eight clothing categories; search, category filters, price sorting, six sizes, persistent browser cart, DUCCY10 coupon, and SQLite-backed demo orders. Prices and totals are validated server-side. No real payment, account system, inventory, fulfilment, email, or admin panel. Do not use for real commerce without further security and business work.

## Run on a computer
Install Python 3.10 or newer. Open a terminal in this extracted folder:

    python -m venv .venv

Activate on Windows:

    .venv\Scripts\activate

Activate on macOS/Linux:

    source .venv/bin/activate

Then:

    pip install -r requirements.txt
    python app.py

Open http://localhost:5000 . Do not open index.html directly: the frontend needs the backend API.

## Another phone on the same Wi-Fi
Keep the computer and server running. Find the computer's local IPv4 address (Windows: ipconfig; macOS/Linux: network settings), then open http://YOUR-LOCAL-IP:5000 on the other phone. Allow port 5000 on a trusted private network only. localhost on a different phone points to that phone, not the computer. This is local testing, not a public deployment. Do not expose the Flask development server to the internet.

## Public hosting
Deploy the entire folder to a Python-capable hosting service. Build command: pip install -r requirements.txt . Start command: gunicorn app:app --bind 0.0.0.0:$PORT . Set PORT if the host does not inject it. Use one application instance with a persistent disk for this SQLite demo. Set DATABASE_PATH to a writable persistent path, such as /data/duccy.db, only after provisioning that disk. If storage is ephemeral, orders disappear on redeploy/restart. Free hosts may have storage/sleeping limitations. GitHub Pages alone cannot run this Python backend.

The hosting provider supplies a live HTTPS URL; domain availability is not guaranteed. Custom domains are optional and must be registered separately. Code is supplied here, not already deployed.

## Google visibility
Opening a live link in Chrome and appearing in Google Search are different. For discovery, deploy publicly, use a unique title/description, create a sitemap with the actual production URL, and verify that URL in Google Search Console. Request indexing there. Indexing and ranking for the word Duccy are not guaranteed. No sitemap with a fake domain is included. Avoid collecting personal information in this demo.

## Structure
app.py: Flask API + static serving + SQLite schema/seed data
public/index.html: page markup
public/style.css: responsive design
public/app.js: frontend, SVG illustrations, cart, checkout
requirements.txt: dependencies
Procfile: example production process command

## API
GET /api/products: product catalog
POST /api/orders: JSON {"items":[{"id":1,"size":"M","quantity":1}],"coupon":"DUCCY10"}
Returns demo order ID and server-calculated totals. No personal data required. Shipping is free for pre-discount subtotal >= 699, otherwise 49. Coupon gives floor(subtotal/10) discount. Orders and their line items are saved to SQLite.

## Checks
Run python test_app.py . Tests use a temporary SQLite database.

## Production limitations
Public demo checkout has no authentication or rate limiting. Before public deployment consider endpoint rate limiting and abuse controls. Before real commerce add inventory transactions, verified payment webhooks, authentication/authorization where needed, privacy controls, legal policies, logs, backups and monitoring. Cart persists only in each browser; it is not synchronized between phones. External Google Fonts are optional; system fonts are the fallback. SVG art needs no external image service.

DUCCY CLOTHING STORE — FULL-STACK STARTER

WHAT'S INCLUDED
- public/index.html: responsive storefront (pink/white)
- public/admin.html: password-protected admin dashboard
- server.js: API for COD/online-labelled orders and status updates
- package.json: Node/Express dependencies
- data/store.json is created automatically at runtime

FEATURES
- Product catalogue, search, category filters
- Product detail popup with sizes and colours
- Wishlist and shopping cart
- Checkout form with COD option
- Server-side order validation and order storage
- Admin login and order status updates
- Mobile-friendly storefront and dashboard

IMPORTANT REAL-WORLD LIMITS
- The online payment option is only a placeholder. No payment gateway is connected.
- COD option collects an order request; it does not book a courier or verify PIN-code eligibility.
- Product images/prices/reviews are sample content. Replace with your own actual inventory.
- Email/WhatsApp order alerts are not integrated.
- Cart/wishlist currently live in each browser's local storage and do not sync across devices.
- The server stores orders in data/store.json. Many free hosts have ephemeral filesystems; use a persistent disk or replace JSON storage with a managed database before production.
- Add legal pages, real contact details, privacy/return/shipping policies, and test order workflows before accepting real customers.
- Never share API keys, ADMIN_PASSWORD or TOKEN_SECRET. Do not commit secrets to GitHub.

RUN LOCALLY
1. Install Node.js on a computer or supported environment.
2. Run: npm install
3. Set environment variables:
   ADMIN_PASSWORD = a strong unique admin password
   TOKEN_SECRET = a long random secret string
   DATA_FILE = ./data/store.json (optional)
4. Run: npm start
5. Open http://localhost:3000
6. Admin page: http://localhost:3000/admin.html

DEPLOY TO A HOST
1. Upload this project to a private GitHub repository or a host that supports Node.js.
2. Create a Node web service, build command `npm install`, start command `npm start`.
3. Set ADMIN_PASSWORD and TOKEN_SECRET in the host's environment settings.
4. Configure persistent storage for DATA_FILE (for example, a persistent disk mounted at a writable path).
5. Open the host's public URL and test an order; open /admin.html to sign in.
6. For robust production, use a managed database (Postgres/Supabase) rather than JSON file storage.

MOBILE NOTE
You can manage the store from another phone once deployed: open the same public URL in a browser. Orders are stored server-side so the admin dashboard can view them. For a reliable live business, persistent storage must be configured on the hosting provider.

RAZORPAY ONLINE PAYMENTS
- A Razorpay Checkout integration is included in the code.
- It will NOT work until the store owner creates a Razorpay merchant account, completes any required onboarding/KYC, and sets RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET as server environment variables.
- Start with test-mode keys and test payments first; use live keys only after the gateway account is activated and your website is ready.
- Never paste secret keys into this chat, HTML, JavaScript frontend, or a public repository.
- Gateway payments are only one part of a production checkout; verify orders, refunds, shipping, policies and order-storage reliability before taking live customer payments.

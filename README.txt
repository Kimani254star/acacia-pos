ACACIA POS - setup
1. GitHub: create a new repo "acacia-pos", upload ALL files from this folder (index.html, style.css, app.js, config.js, landing-gate.js, landing-hooks.js, acacia-appearance.js, landing.html), deploy on Vercel
   (the Books links point to https://acacia-pos.vercel.app/ - change the URL in Books index.html if yours differs).
2. Books repo: replace index.html and acacia-app-inbox.js, add acacia-pos-bridge.js.
3. No new SQL: POS uses the same company_state and app_accounts tables as your other apps.
4. First use: sign in with your Books company, email, password > Settings > pick a fund for Cash / M-Pesa / Card >
   Shift > Open shift > sell.


HOME PAGE
index.html shows the same Acacia Enterprise home page as Books (landing.html, loaded full-screen) to visitors who are not signed in.
Upload every file in this folder; index.html links style.css and the .js files, and landing.html is the home page. Sign In / Point of Sale links open the POS login; Books links open Acacia Books in a new tab.
/#signin goes straight to the login.

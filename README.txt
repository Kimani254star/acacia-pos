ACACIA POS - setup
1. GitHub: create a new repo "acacia-pos", upload ALL files from this folder (index.html, style.css, theme.js, app.js, config.js, landing-gate.js, landing-hooks.js, acacia-appearance.js, landing.html), deploy on Vercel
   (the Books links point to https://acacia-pos.vercel.app/ - change the URL in Books index.html if yours differs).
2. Books repo: replace index.html and acacia-app-inbox.js, add acacia-pos-bridge.js.
3. No new SQL: POS uses the same company_state and app_accounts tables as your other apps.
4. First use: sign in with your Books company, email, password > Settings > pick a fund for Cash / M-Pesa / Card >
   Shift > Open shift > sell.


HOME PAGE
index.html shows the same Acacia Enterprise home page as Books (landing.html, loaded full-screen) to visitors who are not signed in.
Upload every file in this folder; index.html links style.css and the .js files, and landing.html is the home page. Sign In / Point of Sale links open the POS login; Books links open Acacia Books in a new tab.
/#signin goes straight to the login.


THEME
Preferences > Theme: Automatic (follows the device), Light or Dark. Saved on each device.


RIGHT TOOLS RAIL
Same right-side rail as Acacia Books (Notebook, Webinar, Team Status, Meet, Docs, Sheets, Photos, Calendar, Organization Details). Meet/Docs/Sheets/Photos/Calendar open the Books pages; the other four open Acacia Books. Change the Books address with window.ACACIA_BOOKS_URL in config.js. The arrow at the top of the rail hides/shows it.


DASHBOARD
The first button in the left sidebar is now Dashboard (it is the page POS opens on; the last page used is remembered on each device). It shows today's sales, shift status, product and stock counts, held sales, tiles for the POS modules (Point of sale, Shift, Held sales, Sales, Preferences, Settings), tiles that open the other Acacia apps in a new tab, and the product list (search, Low stock, Out of stock; click a product to add it to the sale). "Sell" in the sidebar (or Start selling) opens the selling screen with the cart.
To change the app tiles, add this to config.js:
  window.ACACIA_APPS=[{n:"Acacia Books",i:"📚",u:"https://acacia-books.vercel.app/",s:"Accounts"}];
No new SQL. Files changed: index.html, style.css, app.js, README.txt.


REPORTS
The left sidebar keeps Shift, Held sales, Sales, Preferences and Settings, and has a new Reports button (after Sales). Reports shows sales, payment methods, daily totals and top items for Today, 7 days, 30 days or any date range. The module tiles (Shift, Held sales, Sales, Preferences, Settings) were removed from the Dashboard; only Point of sale remains there.
Files changed: index.html, style.css, app.js, README.txt.

MODULE PAGES
Shift, Held sales, Sales, Reports, Preferences and Settings now open as a full page beside the sidebar showing only that module's details (no dashboard or cart behind it). Close returns to where you were; the open module is highlighted in the sidebar.
Files changed: style.css, app.js, README.txt.

The "Acacia apps" tiles were removed from the Dashboard. Files changed: app.js, README.txt.

The Sell screen now uses the same colours as the Dashboard, and Dashboard product cards are the same size as the Sell product cards. Files changed: style.css, README.txt.

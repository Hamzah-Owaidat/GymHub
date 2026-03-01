# Controllers

- **api/** – Shared API controllers. Same endpoints and JSON for **web** (browser) and **mobile**.  
  Example: `api/authController.js` → login, register, me (used by `/api/auth/*`).

- **web/** – Web-only logic (e.g. server-rendered pages, redirects).  
  - **web/dashboard/** – Dashboard-related controllers (admin, owner, coach dashboards).

Use **api** for anything that returns JSON and is consumed by both web and mobile. Use **web** only when the behavior is specific to the web app (e.g. rendering HTML, cookie/session for server-side auth).

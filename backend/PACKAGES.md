# Backend packages – brief

## Already installed
- **express** – Web framework for routes, middleware, API.
- **dotenv** – Loads `.env` into `process.env` (PORT, JWT_SECRET, DB_*).
- **mysql2** – MySQL driver for Node (used by migrations and app).
- **nodemon** (dev) – Restarts the server on file changes.

---

## To install

### Auth & security
- **jsonwebtoken** – Create and verify JWT tokens for login and protected routes (uses `JWT_SECRET` / `JWT_EXPIRATION` from `.env`).
- **bcryptjs** – Hash and compare passwords (no plain-text storage). Pure JS, works well on Windows; use for `users.password`.

### Validation
- **express-validator** – Validate and sanitize request body/query/params (e.g. email format, required fields, role in allowed list). Keeps validation next to routes.

### HTTP & security middleware
- **cors** – Control which origins can call your API (e.g. allow your frontend only in production).
- **helmet** – Sets secure HTTP headers (X-Content-Type-Options, etc.) to reduce common web vulnerabilities.

### Logging
- **morgan** – Logs each HTTP request (method, URL, status, time). Useful in dev and for debugging.

### File upload
- **multer** (v2.x) – Handle `multipart/form-data` for uploading files (e.g. `profile_image`, gym images). Saves to disk or memory; you can then store paths in DB. Use 2.x for security fixes.

---

## Optional (not installing now)
- **express-rate-limit** – Limit requests per IP to reduce abuse (add when you go live).
- **compression** – Gzip responses to reduce payload size.

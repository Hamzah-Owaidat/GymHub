# Middlewares

## Auth (`auth.js`)

- **requireAuth** – Requires a valid `Authorization: Bearer <token>` header. Decodes JWT and sets `req.user` (payload). Responds 401 if missing or invalid.
- **optionalAuth** – If a valid token is present, sets `req.user`; otherwise `req.user = null`. Use on public routes that may change behavior when logged in.

**JWT payload:** When you implement login, sign tokens with at least: `{ id, email, role, is_active }` so these middlewares and role checks work without a DB lookup on every request.

## Role / permissions (`role.js`)

Use **after** `requireAuth` (so `req.user` exists).

- **requireRole('admin', 'owner')** – Allows only the given roles. Responds 403 if role not allowed.
- **requirePermission('gyms:create')** – Requires the user to have that permission (loaded from `role_permissions` by `req.user.role_id` or `req.user.role`). Caches result on `req.user.permissions` for the request.
- **requireActive** – Responds 403 if `req.user.is_active === false`.
- **requireAdmin** – Shorthand for `requireRole('admin')`.
- **requireAdminOrOwner** – Shorthand for `requireRole('admin', 'owner')`.
- **requireStaff** – Shorthand for `requireRole('admin', 'owner', 'coach')`.

## Usage example

```js
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { requireRole, requirePermission, requireAdmin, requireActive } = require('../middleware/role');

// Protected: any logged-in user
router.get('/me', requireAuth, (req, res) => { ... });

// Protected: admin only
router.delete('/users/:id', requireAuth, requireAdmin, (req, res) => { ... });

// Protected: admin or owner, and account must be active
router.get('/dashboard', requireAuth, requireActive, requireAdminOrOwner, (req, res) => { ... });

// Protected: require specific permission (from role_permissions)
router.post('/gyms', requireAuth, requirePermission('gyms:create'), (req, res) => { ... });

// Public: optional auth to show extra data
router.get('/gyms', optionalAuth, (req, res) => {
  // req.user may be null or the decoded token payload
});
```

## Error handler

`errorHandler` expects errors with `statusCode` (or `status`) and `message` (or `error`). Use `AppError` from `utils/AppError`: `next(new AppError('Forbidden', 403))`.

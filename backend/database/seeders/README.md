# Seeders

Run after migrations to insert initial data.

```bash
npm run seed
```

## 001_seed_admin.js

Creates one admin user. Skips if an admin with the same email already exists.

**Env (optional):**

| Variable | Default |
|----------|--------|
| `SEED_ADMIN_EMAIL` | `admin@gymhub.com` |
| `SEED_ADMIN_PASSWORD` | `Admin@123` |
| `SEED_ADMIN_FIRST_NAME` | `Admin` |
| `SEED_ADMIN_LAST_NAME` | `GymHub` |

Set in `.env` to override (e.g. in production use a strong password).

**Default admin (dev):** `admin@gymhub.com` / `Admin@123`

# GymHub Database

## MySQL database: `gymhub`

### Run migrations

From the `backend` folder:

```bash
npm run migrate
```

Requires `.env` with:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (e.g. `gymhub`)

Creates the database if it does not exist, then runs all `.sql` files in `migrations/` in order.

### Tables (order)

0. `roles` – admin, owner, coach, user (referenced by users.role_id)
1. `permissions` – permission codes (e.g. users:create, gyms:read)
2. `role_permissions` – which permissions each role has (many-to-many)
3. `users` – role_id FK to roles (owners created by admin)
4. `gyms` – one owner, many gyms
5. `gym_images`
6. `coaches` – user + gym link
7. `coach_availability` – day + start/end time
8. `subscription_plans` – per gym (e.g. monthly, yearly, offers)
9. `user_subscriptions` – user’s plan at a gym
10. `sessions` – booked/completed/cancelled (coach or private)
11. `ratings` – gym ratings 1–5
12. `notifications`
13. `payments`

Migrations 012–015 add roles, permissions, role_permissions, and alter users to use role_id.

### Soft delete

Tables that support “delete from dashboard” use `deleted_at`. Set `deleted_at = NOW()` instead of removing the row; in queries, filter with `WHERE deleted_at IS NULL`.

### Enum-like values (no ENUM in DB)

Stored as `VARCHAR`. Allowed values live in `../constants/`:

- `constants/roles.js` → role names (users.role_id → roles.name)
- `constants/permissions.js` → permission codes (role_permissions)
- `constants/days.js` → `coach_availability.day`
- `constants/subscriptionStatus.js` → `user_subscriptions.status`
- `constants/sessionStatus.js` → `sessions.status`
- `constants/notificationTypes.js` → `notifications.type`
- `constants/paymentStatus.js` → `payments.status`

Use the validators (e.g. `isValidRole(value)`) before insert/update.

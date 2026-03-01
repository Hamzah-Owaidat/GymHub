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

1. `users` – admins, owners, coaches, users (owners created by admin)
2. `gyms` – one owner, many gyms
3. `gym_images`
4. `coaches` – user + gym link
5. `coach_availability` – day + start/end time
6. `subscription_plans` – per gym (e.g. monthly, yearly, offers)
7. `user_subscriptions` – user’s plan at a gym
8. `sessions` – booked/completed/cancelled (coach or private)
9. `ratings` – gym ratings 1–5
10. `notifications`
11. `payments`

### Soft delete

Tables that support “delete from dashboard” use `deleted_at`. Set `deleted_at = NOW()` instead of removing the row; in queries, filter with `WHERE deleted_at IS NULL`.

### Enum-like values (no ENUM in DB)

Stored as `VARCHAR`. Allowed values live in `../constants/`:

- `constants/roles.js` → `users.role`
- `constants/days.js` → `coach_availability.day`
- `constants/subscriptionStatus.js` → `user_subscriptions.status`
- `constants/sessionStatus.js` → `sessions.status`
- `constants/notificationTypes.js` → `notifications.type`
- `constants/paymentStatus.js` → `payments.status`

Use the validators (e.g. `isValidRole(value)`) before insert/update.

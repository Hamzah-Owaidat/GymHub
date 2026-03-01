# Postman – Auth API

Base URL: **http://localhost:8080**

Make sure the server is running: `npm run dev`

---

## 1. Register (create user account)

**POST** `http://localhost:8080/api/auth/register`

**Headers:**  
`Content-Type: application/json`

**Body (raw JSON):**

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Optional fields:**

```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "dob": "1990-05-15",
  "phone": "+1234567890"
}
```

**Success (201):**  
`{ "success": true, "user": { ... }, "message": "Registration successful. Please log in." }`  
(No token – user must log in after register.)

**Errors:** 400 (validation), 409 (email already registered)

---

## 2. Login

**POST** `http://localhost:8080/api/auth/login`

**Headers:**  
`Content-Type: application/json`

**Body (raw JSON) – any user:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Body – login as a specific role (e.g. admin):**

```json
{
  "email": "admin@gymhub.com",
  "password": "Admin@123",
  "loginAs": "admin"
}
```

`loginAs` can be: `user` | `admin` | `owner` | `coach`. If the account’s role doesn’t match, you get 403.

**Success (200):**  
`{ "success": true, "user": { ... }, "token": "eyJhbGc..." }`

**Errors:** 401 (wrong email/password), 403 (deactivated or wrong role for `loginAs`)

---

## 3. Get current user (me)

**GET** `http://localhost:8080/api/auth/me`

**Headers:**  
`Authorization: Bearer <paste_token_here>`

No body.

**Success (200):**  
`{ "success": true, "user": { ... } }`

**Errors:** 401 (missing or invalid token), 404 (user not found)

---

## Quick test order

1. **Register** → user is created (no token).
2. **Login** with the same email/password → copy `token` from response.
3. **Me** → set header `Authorization: Bearer <token>` → send request.

**Seed admin (if you ran `npm run seed`):**  
Login with `admin@gymhub.com` / `Admin@123` and `"loginAs": "admin"`.

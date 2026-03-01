/**
 * Seed a default admin user.
 * Run after migrations. Uses SEED_ADMIN_* from .env or defaults below.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DEFAULT_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@gymhub.com';
const DEFAULT_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
const DEFAULT_FIRST_NAME = process.env.SEED_ADMIN_FIRST_NAME || 'Admin';
const DEFAULT_LAST_NAME = process.env.SEED_ADMIN_LAST_NAME || 'GymHub';

async function seedAdmin() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gymhub',
  };

  let conn;
  try {
    conn = await mysql.createConnection(config);

    const [[roleRow]] = await conn.query(
      "SELECT id FROM roles WHERE name = 'admin' AND deleted_at IS NULL LIMIT 1"
    );
    if (!roleRow) {
      console.error('Roles table missing or admin role not found. Run migrations first.');
      process.exit(1);
    }
    const roleId = roleRow.id;

    const [[existing]] = await conn.query(
      'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1',
      [DEFAULT_EMAIL]
    );
    if (existing) {
      console.log('Admin user already exists:', DEFAULT_EMAIL);
      return;
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    await conn.query(
      `INSERT INTO users (first_name, last_name, email, password, role_id, is_active, created_by)
       VALUES (?, ?, ?, ?, ?, TRUE, NULL)`,
      [DEFAULT_FIRST_NAME, DEFAULT_LAST_NAME, DEFAULT_EMAIL, hashedPassword, roleId]
    );
    console.log('Admin user created:', DEFAULT_EMAIL);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

if (require.main === module) {
  seedAdmin();
} else {
  module.exports = seedAdmin;
}

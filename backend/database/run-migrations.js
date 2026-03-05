/**
 * Run all SQL migrations in order.
 * Usage: node database/run-migrations.js (from backend folder)
 * Requires: .env with DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

// Optional: pass a starting prefix, e.g. `node database/run-migrations.js 016`
// to run only migrations whose filename is >= "016".
const START_FROM_PREFIX = process.argv[2] || null;

async function run() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  };

  let conn;
  try {
    conn = await mysql.createConnection(config);

    // Run 000_create_database.sql first (no database selected)
    const createDbPath = path.join(MIGRATIONS_DIR, '000_create_database.sql');
    const createDbSql = fs.readFileSync(createDbPath, 'utf8');
    await conn.query(createDbSql);
    console.log('Database gymhub ensured.');

    await conn.changeUser({ database: process.env.DB_NAME || 'gymhub' });

    let files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql') && f !== '000_create_database.sql')
      .sort();

    if (START_FROM_PREFIX) {
      files = files.filter((f) => f >= START_FROM_PREFIX);
      console.log('Running migrations starting from:', START_FROM_PREFIX);
    }

    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      await conn.query(sql);
      console.log('Ran:', file);
    }

    console.log('Migrations completed.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

run();

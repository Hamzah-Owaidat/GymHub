/**
 * Run all seeders in order.
 * Usage: node database/run-seeders.js (from backend folder)
 * Requires: migrations to have been run first.
 */
require('dotenv').config();
const path = require('path');

const SEEDERS_DIR = path.join(__dirname, 'seeders');

const seedFiles = ['001_seed_admin.js'];

async function run() {
  for (const file of seedFiles) {
    const filePath = path.join(SEEDERS_DIR, file);
    console.log('Running:', file);
    const seed = require(filePath);
    if (typeof seed === 'function') {
      await seed();
    }
  }
  console.log('Seeders completed.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

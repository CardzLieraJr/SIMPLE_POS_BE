/* =========================
   IMPORTS
========================= */

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

/* =========================
   DATABASE CONNECTION
   - Creates/opens SQLite database file
   - Stored in: inventory.db
========================= */

const db = new sqlite3.Database(
  path.join(__dirname, "inventory.db"),
  (err) => {
    if (err) console.error(err);
    else console.log("SQLite Connected");
  }
);

/* =========================
   INITIAL TABLE SETUP
   - Runs once when app starts
   - Ensures tables exist
========================= */

db.serialize(() => {

  /* =========================
     PRODUCTS TABLE
     - Stores inventory items
  ========================= */

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      _id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      barcode TEXT UNIQUE,
      price REAL NOT NULL,
      quantity INTEGER DEFAULT 0,
      image TEXT
    );
  `);

  /* =========================
     TRANSACTIONS TABLE
     - Stores sales records
     - Products stored as JSON string
  ========================= */

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      _id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL NOT NULL,
      products TEXT NOT NULL,
      date TEXT NOT NULL
    );
  `);
});

/* =========================
   EXPORT DATABASE INSTANCE
========================= */

module.exports = db;
/* =========================
   IMPORTS
========================= */

var app = require("express")();
var bodyParser = require("body-parser");

const db = require("../database/db");

/* =========================
   MIDDLEWARE
   - Parses JSON request bodies
========================= */

app.use(bodyParser.json());

module.exports = app;

/* =========================
   ROUTE: HOME
   - API health check
========================= */

app.get("/", (req, res) => {
  res.send("Transactions API");
});

/* =========================
   ROUTE: GET ALL TRANSACTIONS
   - Returns all transactions sorted by newest first
========================= */

app.get("/all", (req, res) => {
  db.all(
    "SELECT * FROM transactions ORDER BY date DESC",
    [],
    (err, rows) => {
      if (err) return res.status(500).send(err);
      res.send(rows);
    }
  );
});

/* =========================
   ROUTE: GET LIMITED TRANSACTIONS
   - Returns latest N transactions (default: 5)
========================= */

app.get("/limit", (req, res) => {
  const limit = parseInt(req.query.limit, 10) || 5;

  db.all(
    "SELECT * FROM transactions ORDER BY date DESC LIMIT ?",
    [limit],
    (err, rows) => {
      if (err) return res.status(500).send(err);
      res.send(rows);
    }
  );
});

/* =========================
   ROUTE: DAILY TOTAL SALES
   - Calculates total sales for a specific day
   - If no date provided, uses current day
========================= */

app.get("/day-total", (req, res) => {
  let start = new Date();
  let end = new Date();

  if (req.query.date) {
    start = new Date(req.query.date);
    end = new Date(req.query.date);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  db.all(
    `SELECT * FROM transactions WHERE date BETWEEN ? AND ?`,
    [start.toISOString(), end.toISOString()],
    (err, rows) => {
      if (err) return res.status(500).send(err);

      const total = rows.reduce(
        (sum, t) => sum + Number(t.total || 0),
        0
      );

      res.send({
        date: start.toISOString(),
        total: Number(total.toFixed(2)),
      });
    }
  );
});

/* =========================
   ROUTE: GET TODAY'S TRANSACTIONS
   - Returns transactions for current day only
========================= */

app.get("/by-date", (req, res) => {
  const start = new Date();
  const end = new Date();

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  db.all(
    `SELECT * FROM transactions WHERE date BETWEEN ? AND ?`,
    [start.toISOString(), end.toISOString()],
    (err, rows) => {
      if (err) return res.status(500).send(err);
      res.send(rows);
    }
  );
});

/* =========================
   ROUTE: CREATE NEW TRANSACTION
   - Stores transaction record
   - Products stored as JSON string
========================= */

app.post("/new", (req, res) => {
  const { total, products, date } = req.body;

  if (!Array.isArray(products)) {
    return res.status(400).send({
      success: false,
      message: "products must be an array",
    });
  }

  db.run(
    `INSERT INTO transactions (total, products, date)
     VALUES (?, ?, ?)`,
    [
      Number(total || 0),
      JSON.stringify(products),
      date || new Date().toISOString(),
    ],
    function (err) {
      if (err) {
        console.log("ERROR:", err);
        return res.status(500).send(err);
      }

      res.send({
        success: true,
        id: this.lastID,
      });
    }
  );
});

/* =========================
   ROUTE: GET SINGLE TRANSACTION
   - Fetch transaction by ID
========================= */

app.get("/:transactionId", (req, res) => {
  db.get(
    "SELECT * FROM transactions WHERE _id = ?",
    [req.params.transactionId],
    (err, row) => {
      if (err) return res.status(500).send(err);
      res.send(row);
    }
  );
});

/* =========================
   ROUTE: DELETE TRANSACTION
   - Removes transaction permanently
========================= */

app.delete("/:id", (req, res) => {
  const id = req.params.id;

  db.run(
    "DELETE FROM transactions WHERE _id = ?",
    [id],
    function (err) {
      if (err) {
        console.log("DELETE ERROR:", err);
        return res.status(500).send(err);
      }

      res.send({
        success: true,
        message: "Transaction deleted",
        deletedId: id,
      });
    }
  );
});
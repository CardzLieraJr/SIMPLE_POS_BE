/* =========================================
   IMPORTS
========================================= */

const express = require("express");
const bodyParser = require("body-parser");
const async = require("async");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const db = require("../database/db");

/* =========================================
   APP INIT
========================================= */

const app = express();

app.use(bodyParser.json());

module.exports = app;

/* =========================================
   STATIC FILES (IMAGE ACCESS)
   - Makes uploaded images publicly accessible
   - Example: /uploads/image.jpg
========================================= */

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

/* =========================================
   MULTER CONFIG (FILE UPLOAD HANDLING)
   - Stores uploaded images in /uploads
   - Renames files with timestamp to avoid duplicates
========================================= */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {
    // Remove extension and spaces from original name
    const originalName = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/\s+/g, "_");

    // Generate timestamp for unique filename
    const now = new Date();

    const dateTime =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0") +
      "_" +
      String(now.getHours()).padStart(2, "0") +
      "-" +
      String(now.getMinutes()).padStart(2, "0") +
      "-" +
      String(now.getSeconds()).padStart(2, "0");

    // Final file name format: name_YYYY-MM-DD_HH-MM-SS.ext
    const finalName =
      originalName + "_" + dateTime + path.extname(file.originalname);

    cb(null, finalName);
  },
});

const upload = multer({
  storage: storage,
});

/* =========================================
   ROUTE: HOME
   - API health check endpoint
========================================= */

app.get("/", (req, res) => {
  res.send("Inventory API Running");
});

/* =========================================
   ROUTE: GET ALL PRODUCTS
   - Fetch all products from database
========================================= */

app.get("/products", (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) {
      return res.status(500).send(err);
    }

    res.send(rows);
  });
});

/* =========================================
   ROUTE: GET PRODUCT BY ID
   - Fetch single product using _id
========================================= */

app.get("/product/:productId", (req, res) => {
  db.get(
    "SELECT * FROM products WHERE _id = ?",
    [req.params.productId],
    (err, row) => {
      if (err) {
        return res.status(500).send(err);
      }

      res.send(row);
    },
  );
});

/* =========================================
   ROUTE: CREATE PRODUCT
   - Supports image upload
========================================= */

app.post("/product", upload.single("image"), (req, res) => {
  const { name, price, quantity, barcode } = req.body;

  const image = req.file ? req.file.filename : null;

  db.run(
    `
      INSERT INTO products
      (name, price, quantity, barcode, image)
      VALUES (?, ?, ?, ?, ?)
    `,
    [name, price, quantity, barcode, image],
    function (err) {
      if (err) {
        console.log(err);
        return res.status(500).send(err);
      }

      res.send({
        _id: this.lastID,
        name,
        price,
        quantity,
        barcode,
        image,
      });
    },
  );
});

/* =========================================
   ROUTE: UPDATE PRODUCT
   - Updates product info and optionally image
   - Deletes old image if replaced
========================================= */

app.put("/product", upload.single("image"), (req, res) => {
  const { _id, name, price, quantity, barcode, image: oldImage } = req.body;

  const newImage = req.file ? req.file.filename : oldImage;

  // Get existing image before updating
  db.get("SELECT image FROM products WHERE _id = ?", [_id], (err, row) => {
    if (err) {
      console.log(err);
      return res.status(500).send(err);
    }

    const previousImage = row?.image;

    db.run(
      `
        UPDATE products
        SET name = ?, price = ?, quantity = ?, barcode = ?, image = ?
        WHERE _id = ?
      `,
      [name, price, quantity, barcode, newImage, _id],
      function (err) {
        if (err) {
          console.log(err);
          return res.status(500).send(err);
        }

        // Delete old image file if a new one was uploaded
        if (req.file && previousImage) {
          const oldPath = path.join(__dirname, "../uploads", previousImage);

          fs.unlink(oldPath, (fsErr) => {
            if (fsErr) {
              console.log("Old image delete error:", fsErr.message);
            } else {
              console.log("Deleted old image:", previousImage);
            }
          });
        }

        res.send({
          success: true,
          product: {
            _id,
            name,
            price,
            quantity,
            barcode,
            image: newImage,
          },
        });
      },
    );
  });
});

/* =========================================
   ROUTE: DELETE PRODUCT
   - Deletes product from DB
   - Also removes image from storage
========================================= */

app.delete("/product/:productId", (req, res) => {
  const id = req.params.productId;

  db.get("SELECT * FROM products WHERE _id = ?", [id], (err, row) => {
    if (err) {
      return res.status(500).send(err);
    }

    if (!row) {
      return res.status(404).send({ message: "Product not found" });
    }

    db.run("DELETE FROM products WHERE _id = ?", [id], function (err) {
      if (err) {
        return res.status(500).send(err);
      }

      // Remove image file if exists
      if (row.image) {
        const filePath = path.join(__dirname, "../uploads", row.image);

        fs.unlink(filePath, (fsErr) => {
          if (fsErr) {
            console.log("File delete error:", fsErr.message);
          }
        });
      }

      res.send({
        message: "Product deleted successfully",
        deletedProduct: row,
      });
    });
  });
});

/* =========================================
   ROUTE: DECREMENT INVENTORY
   - Reduces product quantity after sale
   - Prevents negative stock
========================================= */

app.post("/decrement-inventory", (req, res) => {
  const products = req.body.products;

  if (!Array.isArray(products)) {
    return res.status(400).send({
      success: false,
      message: "products must be array",
    });
  }

  async.eachSeries(
    products,
    (item, cb) => {
      db.get(
        "SELECT quantity FROM products WHERE _id = ?",
        [item._id],
        (err, row) => {
          if (err || !row) return cb();

          const newQty = Math.max(0, row.quantity - item.quantity);

          db.run(
            "UPDATE products SET quantity = ? WHERE _id = ?",
            [newQty, item._id],
            () => cb(),
          );
        },
      );
    },
    () => {
      res.send({
        success: true,
        message: "Inventory updated",
      });
    },
  );
});

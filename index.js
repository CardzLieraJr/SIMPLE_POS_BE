/* =========================
   IMPORTS
========================= */

const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const socketio = require("socket.io");
const multer = require("multer");
const path = require("path");

/* =========================
   APP & SERVER SETUP
========================= */

const app = express();
const server = http.createServer(app);
const io = socketio(server);

/* =========================
   GLOBAL STATE
   - Stores live cart data for real-time updates
========================= */

let liveCart = [];

/* =========================
   SERVER CONFIG
========================= */

const PORT = process.env.PORT || 8001;

console.log("Real time POS running");
console.log("Server started");

/* =========================
   BODY PARSER MIDDLEWARE
   - Handles JSON & form data
========================= */

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

/* =========================
   CORS CONFIGURATION
   - Allows cross-origin requests from any domain
========================= */

app.all("/*", function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");

  res.header(
    "Access-Control-Allow-Methods",
    "GET,PUT,POST,DELETE,OPTIONS"
  );

  res.header(
    "Access-Control-Allow-Headers",
    "Content-type,Accept,X-Access-Token,X-Key"
  );

  // Handle preflight request
  if (req.method === "OPTIONS") {
    res.status(200).end();
  } else {
    next();
  }
});

/* =========================
   STATIC FILES
   - Serve uploaded images publicly
========================= */

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"))
);

/* =========================
   MULTER CONFIG (FILE UPLOADS)
   - Stores images in /uploads
   - Uses timestamp + filename for uniqueness
========================= */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },

  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

/* =========================
   ROUTE: TEST API
   - Checks if server is running
========================= */

app.get("/", function (req, res) {
  res.send("Real time POS web app running.");
});

/* =========================
   ROUTE: IMAGE UPLOAD
   - Uploads image file to server
   - Returns file path
========================= */

app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  res.json({
    success: true,
    filename: req.file.filename,
    path: `/uploads/${req.file.filename}`,
  });
});

/* =========================
   API ROUTES
   - Inventory module
   - Transactions module
========================= */

app.use("/api/inventory", require("./api/inventory"));
app.use("/api/", require("./api/transactions"));

/* =========================
   SOCKET.IO REAL-TIME SYSTEM
   - Handles live cart updates between clients
========================= */

io.on("connection", function (socket) {
  console.log("Client connected");

  /* -------------------------
     CART TRANSACTION COMPLETE
     - Clears or refreshes live cart across clients
  ------------------------- */
  socket.on("cart-transaction-complete", function () {
    socket.broadcast.emit("update-live-cart-display", {});
  });

  /* -------------------------
     LIVE CART PAGE LOADED
     - Sends current cart state to new client
  ------------------------- */
  socket.on("live-cart-page-loaded", function () {
    socket.emit("update-live-cart-display", liveCart);
  });

  /* -------------------------
     INITIAL CART SYNC
     - Sends current live cart to connected client
  ------------------------- */
  socket.emit("update-live-cart-display", liveCart);

  /* -------------------------
     UPDATE LIVE CART
     - Updates global cart state
     - Broadcasts to all other clients
  ------------------------- */
  socket.on("update-live-cart", function (cartData) {
    liveCart = cartData;

    socket.broadcast.emit("update-live-cart-display", liveCart);
  });

  /* -------------------------
     DISCONNECT EVENT
  ------------------------- */
  socket.on("disconnect", function () {
    console.log("Client disconnected");
  });
});

/* =========================
   START SERVER
========================= */

server.listen(PORT, () =>
  console.log(`Listening on PORT ${PORT}`)
);
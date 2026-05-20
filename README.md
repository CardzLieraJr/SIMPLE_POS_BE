# REAL TIME POS SYSTEM (NODE + SQLITE + SOCKET.IO)

A **Real-Time Point of Sale (POS) backend system** built with Node.js, Express, SQLite, and Socket.IO.  
It supports inventory management, transaction processing, image uploads, and real-time cart synchronization.

---

## 🚀 Features

- 📦 Inventory Management (CRUD)
- 💰 Transaction Recording
- 📊 Daily Sales Reports
- 🖼️ Image Upload System (Multer)
- 🔄 Real-Time Cart Updates (Socket.IO)
- 🗄️ SQLite Database (Lightweight, file-based)
- ⚡ RESTful API

---

## 🛠️ Tech Stack

- Node.js
- Express.js
- SQLite3
- Socket.IO
- Multer
- Async.js
- Body-Parser

---

## 📁 Project Structure

```
server/
│── api/
│   ├── inventory.js
│   ├── transactions.js
│
│── uploads/          # Uploaded images
│
│── database/
│   └── db.js
│
│── index.js          # Main server file
│── package.json
```

---

## ⚙️ Installation

### 1. Clone the repository
```bash
git clone https://github.com/CardzLieraJr/
```

### 2. Install dependencies
```bash
npm install
```

## ▶️ Running the Server
Development mode (with nodemon)
```bash
npm run dev
```

### Production mode
```bash
npm start
```

## 🌐 Server Runs On
```
http://localhost:8001
```

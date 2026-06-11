# SmartOps Inventory Management System

A full-stack inventory management web application with real-time alerts, restock request tracking, and MongoDB-backed persistence.

---

## 📋 Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Startup Instructions](#startup-instructions)
- [Ports Reference](#ports-reference)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)
- [NPM Scripts](#npm-scripts)

---

## 🛠 Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 19, Vite 8, TailwindCSS 4     |
| Backend   | Node.js, Express 4, Mongoose 8      |
| Database  | MongoDB (local or Atlas)            |
| HTTP      | Axios (frontend ↔ backend proxy)    |

---

## 📁 Project Structure

```
Demo/
├── src/                  # React frontend source
│   ├── components/       # Reusable UI components
│   ├── pages/            # Page-level components
│   └── services/         # API service modules
├── server/               # Express backend
│   ├── config/db.js      # MongoDB connection
│   ├── controllers/      # Route logic
│   ├── middleware/       # Error handling, validation
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API route definitions
│   ├── server.js         # Main entry point
│   └── .env              # ⚠️ Required — see below
├── package.json          # Frontend dependencies & scripts
├── vite.config.js        # Vite + proxy configuration
├── start.bat             # ✅ One-click launcher (Windows)
└── README.md
```

---

## ✅ Prerequisites

Before starting, ensure you have:

1. **Node.js v18+** — [Download](https://nodejs.org/)
2. **MongoDB** — running locally on `mongodb://localhost:27017` **OR** a MongoDB Atlas connection string
   - To start MongoDB locally (if installed as a service): it starts automatically on Windows boot
   - To start manually: `mongod --dbpath C:\data\db`
3. **npm v8+** — comes bundled with Node.js

---

## 🔧 Environment Variables

The backend requires a `.env` file inside the `/server` directory.

**This file already exists at `server/.env`** with the following content:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/smartops
```

> See `server/.env.example` for documentation on all available variables.

| Variable  | Default                                  | Description                        |
|-----------|------------------------------------------|------------------------------------|
| PORT      | `5000`                                   | Port the Express server listens on |
| MONGO_URI | `mongodb://localhost:27017/smartops`     | MongoDB connection string          |

---

## 🚀 Startup Instructions

### Option 1: One-Click Launcher (Recommended)

Simply double-click **`start.bat`** in the project root.

This will:
- Check for Node.js
- Kill any stale processes on ports 5000 and 5173
- Install dependencies if needed
- Start the backend in one window
- Start the frontend in another window
- Display the URLs to open

### Option 2: Manual (Two Terminals)

**Terminal 1 — Backend:**
```bash
cd server
node server.js
```

**Terminal 2 — Frontend:**
```bash
npm run dev:frontend
```

### Option 3: Run Both Together (Single Terminal)

```bash
npm run dev:all
```

> This uses `concurrently` to run both backend and frontend in one terminal with colored output.

---

## 🌐 Ports Reference

| Service       | Default Port | URL                          |
|---------------|-------------|-------------------------------|
| Frontend      | **5173**     | http://localhost:5173         |
| Backend API   | **5000**     | http://localhost:5000         |
| MongoDB       | **27017**    | mongodb://localhost:27017     |

> **Go Live** in the IDE should always point to: **`http://localhost:5173`**

---

## 💓 Health Checks

Once running, verify both services:

```bash
# Backend health
curl http://localhost:5000/health
# Expected: {"status":"healthy","timestamp":"...","port":5000}

# Backend API health
curl http://localhost:5000/api/health

# Frontend (should return HTTP 200)
curl -I http://localhost:5173/
```

---

## 🔧 NPM Scripts

### Root (Frontend + Orchestration)

| Script            | Command              | Description                                  |
|-------------------|----------------------|----------------------------------------------|
| `npm run dev`     | `vite --port 5173`   | Start frontend dev server                    |
| `npm run dev:frontend` | `vite --port 5173` | Same as above (explicit)                  |
| `npm run dev:server`   | `node server/server.js` | Start backend only                   |
| `npm run dev:all` | `concurrently ...`   | Start **both** frontend & backend together   |
| `npm run start`   | same as dev:all      | Alias for dev:all                            |
| `npm run build`   | `vite build`         | Build frontend for production                |

### Server (`/server` directory)

| Script            | Command              | Description                                  |
|-------------------|----------------------|----------------------------------------------|
| `npm start`       | `node server.js`     | Start server (production mode)               |
| `npm run dev`     | `nodemon server.js`  | Start server with auto-restart on changes    |

---

## 🛠 Troubleshooting

### `ERR_CONNECTION_REFUSED` on Go Live

1. Make sure Vite is running: check for `http://localhost:5173` in the terminal
2. Go Live must point to port **5173** (not 5000)
3. Run `start.bat` to restart everything cleanly

### Port already in use

The backend auto-detects port conflicts and moves to the next free port. You'll see a warning:
```
⚠️  Port 5000 is in use, trying 5001...
```

For the frontend, Vite also auto-picks the next free port.

If you want to force-clear ports:
```powershell
# Find and kill process on port 5000
netstat -aon | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

### MongoDB connection fails

```
Error Connecting to MongoDB: connect ECONNREFUSED
```

- Check MongoDB is running: open **Services** (services.msc) and verify `MongoDB` is started
- Or start it manually: `mongod --dbpath C:\data\db`
- Verify the `MONGO_URI` in `server/.env`

### Dependencies missing

```bash
# Frontend
npm install

# Backend
cd server && npm install
```

---

## 📊 Verified Startup Test (Last Run)

| Check                        | Status |
|------------------------------|--------|
| Backend starts on port 5000  | ✅     |
| MongoDB connects             | ✅     |
| `/health` returns 200        | ✅     |
| `/api/health` returns 200    | ✅     |
| Frontend starts on port 5173 | ✅     |
| Frontend returns HTTP 200    | ✅     |
| API proxy `/api/*` works     | ✅     |
| Go Live URL                  | `http://localhost:5173` |

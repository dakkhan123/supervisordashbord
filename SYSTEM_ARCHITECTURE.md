# 🏗️ SmartOps — How Everything Works Together
### *A Plain-English Guide to the Full System Architecture*

> **Reading Tip:** This document is best viewed in VS Code with the **Markdown Preview Enhanced** extension, or press `Ctrl+Shift+V` in VS Code to preview it. Every section builds on the last — read top to bottom for the full picture.

---

## 📋 Table of Contents

| # | Topic | What You'll Learn |
|---|-------|-------------------|
| [1](#1-the-big-picture) | 🗺️ The Big Picture | How all 3 layers talk to each other |
| [2](#2-the-three-layers-explained) | 🧱 The Three Layers | Frontend, Backend, Database — what each one does |
| [3](#3-the-request-journey) | 🚀 The Request Journey | Step-by-step: what happens when you click a button |
| [4](#4-crud-pipeline-complete-walkthrough) | 🔄 CRUD Pipeline | Create, Read, Update, Delete — every step explained |
| [5](#5-authentication--security-pipeline) | 🔐 Auth & Security | How login & JWT tokens protect everything |
| [6](#6-routing-explained) | 🛣️ Routing | Frontend routing vs Backend routing |
| [7](#7-the-database-layer) | 🗄️ Database | MongoDB, Mongoose Models, how data is stored |
| [8](#8-middleware-the-gatekeeper) | 🚦 Middleware | The "security guard" between requests and data |
| [9](#9-websockets--real-time) | ⚡ Real-Time (WebSockets) | How live updates work without refreshing |
| [10](#10-the-complete-wire-diagram) | 🔌 Full Wire Diagram | Everything connected in one diagram |
| [11](#11-real-code-walkthrough) | 💻 Real Code Walkthrough | Your actual files — line by line explained |
| [12](#12-the-crud-cheat-sheet) | 📊 CRUD Cheat Sheet | Quick reference table for all operations |

---

## 1. The Big Picture

Imagine your SmartOps application like a **restaurant**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    🍽️  THE RESTAURANT ANALOGY                   │
│                                                                  │
│  👤 YOU (Browser)     =   The Customer sitting at a table       │
│  📱 React Frontend    =   The Menu + Waiter                     │
│  ⚙️  Express Backend   =   The Kitchen (where food is made)     │
│  🗄️  MongoDB Database  =   The Pantry/Fridge (where food lives)  │
│                                                                  │
│  When you want a dish (data):                                   │
│  You → tell the Waiter → Waiter goes to Kitchen →              │
│  Kitchen gets ingredients from Pantry → Kitchen cooks it →      │
│  Waiter brings it back → You eat it (see it on screen)         │
└─────────────────────────────────────────────────────────────────┘
```

In tech terms, your SmartOps app has **3 main layers**:

```
[Browser/React App]  ←→  [Node.js/Express Server]  ←→  [MongoDB Database]
     Port 5173              Port 5000                    Port 27017
   (Your screen)         (The brain)                  (The memory)
```

> **💡 Key Insight:** These three parts are completely **separate programs**. They talk to each other through a language called **HTTP** (the same language websites use). Think of HTTP like a phone call between the three parts.

---

## 2. The Three Layers Explained

### 🎨 Layer 1: Frontend (React + Vite) — "What You See"

**What it is:** The web pages you look at. It runs entirely in **your browser** (Chrome, Firefox, etc.).

**Your files live here:**
```
src/
├── pages/
│   ├── Login.jsx          ← The login screen
│   ├── WorkerOverview.jsx ← The workers management page
│   └── ...                ← All other pages
├── components/
│   ├── ProtectedRoute.jsx ← Guards pages from non-logged-in users
│   └── ...                ← Reusable UI pieces
├── services/
│   └── api.js             ← ⭐ The MESSENGER — sends requests to the backend
└── App.jsx                ← The master controller of all pages
```

**What the Frontend does:**
- Shows buttons, tables, forms on screen
- When you click "Add Worker" → it **packages your data** and sends it to the backend
- When backend responds → it **displays the result** on screen
- It **does NOT** directly touch the database — ever!

---

### ⚙️ Layer 2: Backend (Node.js + Express) — "The Brain"

**What it is:** A server program running on your computer (not in the browser). It **receives requests** from the frontend, **thinks about what to do**, and **talks to the database**.

**Your files live here:**
```
smartops-supervisor/
├── server.js          ← ⭐ The MAIN ENTRY — starts everything
├── routes/
│   ├── auth.js        ← Handles /api/auth/login, /register
│   ├── tasks.js       ← Handles /api/tasks (CRUD for tasks)
│   ├── attendance.js  ← Handles /api/attendance, /api/workers
│   └── inventory.js   ← Handles /api/inventory
├── controllers/
│   └── taskController.js  ← The actual logic for each route
├── models/
│   ├── Worker.js      ← ⭐ Blueprint of how a Worker is stored in DB
│   ├── Task.js        ← Blueprint of how a Task is stored
│   └── ...            ← All other data shapes
├── middleware/
│   └── auth.js        ← 🚦 The Security Guard
├── config/
│   └── db.js          ← Connects to MongoDB
└── socket/
    └── escalationSocket.js  ← Real-time WebSocket magic
```

**What the Backend does:**
- Listens on port `5000` for requests from the frontend
- Checks if you're logged in (auth middleware)
- Runs the business logic (e.g., "can this user delete this worker?")
- Reads/writes from the database
- Sends back a response (success or error)

---

### 🗄️ Layer 3: Database (MongoDB) — "The Memory"

**What it is:** A program that stores all your data permanently. Even if you close the app, data stays here.

**Your data lives here:**
```
MongoDB Database: "smartops"
├── Collection: users        ← Supervisor login accounts
├── Collection: workers      ← Worker profiles
├── Collection: tasks        ← Task records
├── Collection: inventory    ← Stock items
├── Collection: attendance   ← Check-in/out records
├── Collection: alerts       ← System alerts
├── Collection: notifications← User notifications
└── Collection: salary       ← Salary records
```

**What the Database does:**
- Stores data in **collections** (like Excel sheets)
- Each item (worker, task, etc.) is a **document** (like a row in Excel)
- Only the Backend can talk to it — the Frontend never touches it directly!

---

## 3. The Request Journey

Here's **exactly** what happens when you open the Workers page:

```
Step 1: You open the browser and go to http://localhost:5173/workers

Step 2: React's Router looks at "/workers" and loads WorkerOverview.jsx

Step 3: WorkerOverview.jsx says "I need data!" and calls:
        api.getWorkers()

Step 4: api.js sends an HTTP GET request to:
        http://localhost:5000/api/workers
        (It also attaches your login token in the headers)

Step 5: Express server receives the request.
        It checks: "Does this person have a valid token?"
        → auth middleware runs first

Step 6: Token is valid! Express calls the Worker controller's
        getAllWorkers() function

Step 7: The controller asks MongoDB:
        Worker.find()  ← "Give me ALL workers"

Step 8: MongoDB returns a list of worker documents

Step 9: Controller sends the data back:
        res.json({ success: true, data: workers })

Step 10: api.js in the frontend receives this JSON response

Step 11: WorkerOverview.jsx takes the data and renders it as
         a table on screen — YOU SEE THE WORKERS! ✅
```

### Visual Timeline:

```
YOU          REACT           API.JS         EXPRESS        MONGODB
 │              │               │               │               │
 │──click──────▶│               │               │               │
 │              │──getWorkers()▶│               │               │
 │              │               │──GET /api/──▶│               │
 │              │               │   workers     │──auth check   │
 │              │               │               │──Worker.find()▶│
 │              │               │               │               │──query
 │              │               │               │◀──results─────│
 │              │               │◀──JSON data───│               │
 │              │◀──response────│               │               │
 │◀──renders────│               │               │               │
 │   on screen  │               │               │               │
```

---

## 4. CRUD Pipeline — Complete Walkthrough

**CRUD** stands for:
- **C**reate → Adding a new worker/task/item
- **R**ead → Viewing workers/tasks/items
- **U**pdate → Editing a worker/task/item
- **D**elete → Removing a worker/task/item

These 4 operations cover **literally everything** any app can do to data.

---

### ➕ CREATE — "Adding a New Worker"

**HTTP Method used:** `POST`

```
STEP 1 — FRONTEND (WorkerOverview.jsx)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
You fill out the "Add Worker" form and click Submit.
React gathers your form data into an object:
{
  name: "Rajesh Kumar",
  phone: "9876543210",
  role: "Worker",
  salary: 15000,
  status: "Active"
}

STEP 2 — API SERVICE (src/services/api.js)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
api.createWorker(workerData)
→ Sends HTTP POST to http://localhost:5000/api/workers
→ Body contains the JSON object above
→ Header contains: Authorization: Bearer <your_jwt_token>

STEP 3 — EXPRESS ROUTING (smartops-supervisor/server.js)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use('/api/workers', authMiddleware, workersRouter);
↓
First: authMiddleware checks your token (is it valid? yes → proceed)
Then: workersRouter handles POST /

STEP 4 — CONTROLLER (controllers/workerController.js)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
createWorker function runs:
→ Validates the data
→ Calls Worker.create(req.body)

STEP 5 — MODEL + DATABASE (models/Worker.js → MongoDB)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mongoose checks the Worker schema:
- Is name a String? ✅
- Is salary a Number? ✅
- Is role one of ['Worker', 'Supervisor']? ✅
→ MongoDB creates a new document with a unique _id
→ Data is saved to disk permanently

STEP 6 — RESPONSE FLOWS BACK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MongoDB → Controller → Express → api.js → React
React shows: "Worker added successfully!" ✅
The workers table refreshes automatically.
```

---

### 📖 READ — "Viewing All Workers"

**HTTP Method used:** `GET`

```
STEP 1 — FRONTEND
React component mounts → calls api.getWorkers()

STEP 2 — API SERVICE
Sends HTTP GET to: /api/workers
(Optionally with query params: /api/workers?status=Active&search=raj)

STEP 3 — EXPRESS ROUTING
app.use('/api/workers', authMiddleware, workersRouter)
→ Auth check passes
→ GET / → workerController.getAllWorkers()

STEP 4 — CONTROLLER
Worker.find(filters)  ← finds matching documents
.sort({ createdAt: -1 })  ← newest first
.lean()  ← converts to plain JS objects (faster)

STEP 5 — DATABASE
MongoDB scans the "workers" collection
Returns array of matching documents

STEP 6 — RESPONSE
{ success: true, data: [ {...worker1}, {...worker2} ] }
→ React maps this array and renders each worker as a table row
```

---

### ✏️ UPDATE — "Editing a Worker's Salary"

**HTTP Method used:** `PUT`

```
STEP 1 — FRONTEND
You click "Edit" on Rajesh Kumar's row.
A form pre-fills with current data.
You change salary from 15000 to 18000.
You click "Save".

STEP 2 — API SERVICE
api.updateWorker("64abc123...", { salary: 18000 })
→ HTTP PUT to /api/workers/64abc123...
  (64abc123... is the worker's unique MongoDB _id)

STEP 3 — EXPRESS ROUTING
app.use('/api/workers', authMiddleware, workersRouter)
→ Auth check passes
→ PUT /:id → workerController.updateWorker()
→ req.params.id = "64abc123..."

STEP 4 — CONTROLLER
Worker.findByIdAndUpdate(
  req.params.id,    ← which worker?
  req.body,         ← what to change?
  { new: true }     ← return the UPDATED document
)

STEP 5 — DATABASE
MongoDB finds the document with _id = "64abc123..."
Updates only the changed fields (salary: 15000 → 18000)
Other fields (name, phone, role) stay untouched

STEP 6 — RESPONSE
Returns the updated worker object
React updates the table row in real-time ✅
```

---

### 🗑️ DELETE — "Removing a Worker"

**HTTP Method used:** `DELETE`

```
STEP 1 — FRONTEND
You click the "Delete" button on a worker.
A confirmation dialog appears: "Are you sure?"
You click "Yes, Delete".

STEP 2 — API SERVICE
api.deleteWorker("64abc123...")
→ HTTP DELETE to /api/workers/64abc123...

STEP 3 — EXPRESS ROUTING
app.use('/api/workers', authMiddleware, workersRouter)
→ Auth check passes
→ DELETE /:id → workerController.deleteWorker()

STEP 4 — CONTROLLER
Worker.findByIdAndDelete(req.params.id)

STEP 5 — DATABASE
MongoDB permanently removes the document from "workers" collection
The data is GONE (unless you have backups)

STEP 6 — RESPONSE
{ success: true, message: "Worker deleted" }
React removes the row from the table ✅
```

---

## 5. Authentication & Security Pipeline

> **Plain English:** Authentication is like a hotel key card. When you log in, you get a special card (token). Every time you enter a room (make a request), you swipe your card. No card = no entry.

### 🔑 Login Flow — How You Get Your Token

```
YOU TYPE username + password → Click "Sign In"

                    ┌─────────────────────────────┐
FRONTEND            │ Login.jsx runs handleSubmit  │
                    │ Calls api.login(credentials) │
                    └──────────────┬──────────────┘
                                   │ POST /api/auth/login
                                   ▼
                    ┌─────────────────────────────┐
BACKEND             │ authController.login runs    │
                    │ 1. Finds user in DB by name  │
                    │ 2. Compares password (hashed)│
                    │ 3. Generates a JWT token     │
                    └──────────────┬──────────────┘
                                   │ { success: true, token: "eyJ..." }
                                   ▼
                    ┌─────────────────────────────┐
FRONTEND            │ Login.jsx receives token     │
                    │ Stores it in localStorage:   │
                    │ localStorage.setItem(        │
                    │   'smartops_token', token)   │
                    │ Redirects to dashboard       │
                    └─────────────────────────────┘
```

### 🚦 Every Request After Login

```
Your api.js (the authFetch function) does this AUTOMATICALLY:

1. Reads your token from localStorage
2. Adds it to every request header:
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
3. Sends the request to the backend

On the backend, auth middleware (middleware/auth.js) does:

1. Reads the Authorization header
2. Extracts the token (everything after "Bearer ")
3. Verifies it with jwt.verify(token, JWT_SECRET)
   → If VALID: req.user = decoded user info → calls next() → proceeds
   → If INVALID/EXPIRED: returns 401 Unauthorized → request BLOCKED

If you get a 401, api.js removes your token from localStorage
→ You get logged out automatically
```

### 🔐 What is a JWT Token?

A **JWT (JSON Web Token)** is just a **signed piece of text** that contains:

```
eyJhbGciOiJIUzI1NiJ9    ← Header: "I'm a JWT, signed with HS256"
.
eyJ1c2VySWQiOiI2NGFiYyIsInVzZXJuYW1lIjoicmFqZXNoIn0    ← Payload
.
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c    ← Signature (tamper-proof)
```

Decoded, the payload says:
```json
{
  "userId": "64abc123...",
  "username": "rajesh.kumar",
  "iat": 1718831936,
  "exp": 1718918336
}
```

The backend uses this to know **WHO** is making the request without looking up the database every time.

---

## 6. Routing Explained

There are **TWO completely different types** of routing in your app. Don't mix them up!

### 🎨 Frontend Routing (React Router)

This handles **which page to show** in the browser. It's all done in the browser — no server involved.

```
Your App.jsx defines these routes:

/              → Dashboard page
/login         → Login.jsx
/register      → Register page  
/workers       → WorkerOverview.jsx
/tasks         → Tasks page
/inventory     → Inventory page
/attendance    → Attendance page
/alerts        → Alerts page
/notifications → Notifications page
/performance   → Performance reports

When you click a link or navigate:
→ React Router changes the URL in the address bar
→ It shows the correct component WITHOUT reloading the page
→ This is called a "Single Page Application" (SPA)
```

**ProtectedRoute.jsx** — The Bouncer:
```
Before showing any protected page, it checks:
  "Is there a smartops_token in localStorage?"
    YES → Show the page
    NO  → Redirect to /login

This prevents non-logged-in users from accessing the dashboard.
```

### ⚙️ Backend Routing (Express Router)

This handles **what the server does** when it receives a request. Lives in `server.js`:

```javascript
// From your server.js:
app.use('/api/auth',         authRouter);           // No auth required
app.use('/api/inventory',    authMiddleware, inventoryRouter);   // Protected
app.use('/api/tasks',        authMiddleware, tasksRouter);       // Protected
app.use('/api/attendance',   authMiddleware, attendanceRouter);  // Protected
app.use('/api/workers',      authMiddleware, workersRouter);     // Protected
app.use('/api/performance',  authMiddleware, performanceRouter); // Protected
```

**The Route Matching Map:**

| HTTP Method | URL | What it does | Your Code |
|-------------|-----|--------------|-----------|
| POST | `/api/auth/login` | Log in | `auth.js → authController.login` |
| POST | `/api/auth/register` | Create account | `auth.js → authController.register` |
| GET | `/api/auth/me` | Get my profile | `auth.js → authController.getMe` |
| GET | `/api/workers` | List all workers | `tasks.js → getAllWorkers` |
| POST | `/api/workers` | Add a worker | `tasks.js → createWorker` |
| PUT | `/api/workers/:id` | Update a worker | `tasks.js → updateWorker` |
| DELETE | `/api/workers/:id` | Remove a worker | `tasks.js → deleteWorker` |
| GET | `/api/tasks` | List all tasks | `tasks.js → getAllTasks` |
| POST | `/api/tasks` | Create a task | `tasks.js → createTask` |
| PUT | `/api/tasks/:id` | Update a task | `tasks.js → updateTask` |
| DELETE | `/api/tasks/:id` | Delete a task | `tasks.js → deleteTask` |

---

## 7. The Database Layer

### 🗄️ MongoDB — How Data is Stored

MongoDB stores data in **collections** of **documents**. Think of it like this:

```
Traditional SQL (Excel-like):
┌────────────────────────────────────────┐
│ TABLE: workers                         │
│ id  │ name   │ role   │ salary │ status│
│ 1   │ Rajesh │ Worker │ 15000  │ Active│
│ 2   │ Priya  │ Super  │ 25000  │ Active│
└────────────────────────────────────────┘

MongoDB (Document-like):
Collection: workers
Document 1: {
  _id: ObjectId("64abc123..."),
  name: "Rajesh Kumar",
  phone: "9876543210",
  role: "Worker",
  salary: 15000,
  status: "Active",
  createdAt: "2026-01-15T10:30:00Z",
  updatedAt: "2026-06-19T09:00:00Z"
}
```

### 📐 Mongoose Models — The Blueprint

Your `models/Worker.js` defines the **shape** of every worker document:

```javascript
// From your actual models/Worker.js:
const WorkerSchema = new mongoose.Schema({
  name:   { type: String,  required: true },  // Must have a name
  phone:  { type: String                  },  // Phone is optional
  role:   { type: String,  enum: ['Worker', 'Supervisor'] }, // Only these two values
  salary: { type: Number,  required: true },  // Must have a salary
  status: { type: String,  enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true }); // Auto-adds createdAt + updatedAt
```

**Why do we need a Schema/Model?**

Without it, someone could send `{ name: "Hacker", salary: "DELETE ALL" }` and break your database. The schema **validates** data before saving it.

### 🔗 How MongoDB Connects

From your `config/db.js`:

```
Server starts
     ↓
connectDB() runs
     ↓
mongoose.connect('mongodb://127.0.0.1:27017/smartops')
     ↓
MongoDB is running locally on port 27017
     ↓
Database named "smartops" is used (created if it doesn't exist)
     ↓
If connection fails → wait 3 seconds → retry (up to 5 times)
If all retries fail → server exits with error
```

---

## 8. Middleware — The Gatekeeper

**Middleware** is code that runs **in between** receiving a request and sending a response. Think of it as checkpoints.

```
REQUEST ARRIVES
      │
      ▼
┌──────────────────┐
│  CORS Middleware │ ← "Is this request from an allowed website?"
│  (server.js)     │   Only localhost is allowed in your app
└────────┬─────────┘
         │ ✅ allowed
         ▼
┌──────────────────┐
│  JSON Middleware │ ← "Read the request body and parse JSON text"
│  express.json()  │   Converts raw text to JavaScript object
└────────┬─────────┘
         │ ✅ parsed
         ▼
┌──────────────────┐
│  Logger          │ ← "Print to console: POST /api/workers - 10:30AM"
│  (server.js)     │   Helps you debug
└────────┬─────────┘
         │ ✅ logged
         ▼
┌──────────────────┐
│  Auth Middleware │ ← "Does this person have a valid JWT token?"
│  middleware/     │   Protected routes require this
│  auth.js         │   (skipped for /api/auth/login and /register)
└────────┬─────────┘
         │ ✅ authenticated
         ▼
┌──────────────────┐
│  Route Handler   │ ← The actual business logic runs here
│  (controller)    │   Worker.find(), Task.create(), etc.
└────────┬─────────┘
         │ ✅ data processed
         ▼
┌──────────────────┐
│  Error Handler   │ ← "Did anything go wrong? Send a nice error message"
│  (server.js)     │   Instead of crashing
└────────┬─────────┘
         │
         ▼
   RESPONSE SENT
```

**Your actual auth middleware explained line by line:**

```javascript
// middleware/auth.js — YOUR ACTUAL CODE EXPLAINED:

module.exports = (req, res, next) => {
  // 1. Read the Authorization header from the request
  const authHeader = req.headers.authorization;

  // 2. If there's no header, or it doesn't start with "Bearer "
  //    → Reject the request immediately
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token!' });
  }

  // 3. Extract just the token (remove the "Bearer " prefix)
  const token = authHeader.split(' ')[1];

  try {
    // 4. Verify the token using our secret key
    //    If someone tampered with the token, this throws an error
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5. Attach the user info (from the token) to the request
    //    Now controllers can use req.user.userId to know WHO is asking
    req.user = decoded;

    // 6. Call next() → move to the actual route handler
    next();

  } catch (err) {
    // 7. Token was invalid or expired
    return res.status(401).json({ error: 'Token failed!' });
  }
};
```

---

## 9. WebSockets — Real-Time Updates

**Normal HTTP:** You ask → You get an answer → Done. (One-way street)

**WebSockets:** You connect → You **keep the connection open** → The server can push updates **whenever it wants** without you asking.

```
Your App uses Socket.io for ESCALATION alerts:

Browser                          Server
   │                               │
   │──connect websocket────────────▶│
   │                               │
   │  [both stay connected]        │
   │                               │
   │                               │  ← New escalation created by someone
   │◀──emit('new_escalation', data)─│
   │                               │
   │  [Alert appears on screen!]   │
   │  without you refreshing! ✅    │
```

This is handled by:
- **Server side:** `smartops-supervisor/socket/escalationSocket.js`
- **Client side:** React components listen for socket events

---

## 10. The Complete Wire Diagram

Here is your **entire SmartOps system** wired up in one diagram:

```
╔════════════════════════════════════════════════════════════════════════╗
║                    SMARTOPS COMPLETE ARCHITECTURE                      ║
╠════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  ┌─────────────────────────────────────┐                              ║
║  │         BROWSER (Port 5173)         │                              ║
║  │  ┌───────────────────────────────┐  │                              ║
║  │  │    React + Vite (index.html)  │  │                              ║
║  │  │                               │  │                              ║
║  │  │  ┌──────────┐  ┌──────────┐  │  │                              ║
║  │  │  │ App.jsx  │→ │ Router   │  │  │                              ║
║  │  │  └──────────┘  └────┬─────┘  │  │                              ║
║  │  │                     │        │  │                              ║
║  │  │         ┌───────────┼──────────────────────────┐              ║
║  │  │         ▼           ▼        ▼     ▼           ▼              ║
║  │  │    /login     /workers  /tasks  /inventory  /alerts           ║
║  │  │    Login.jsx  WorkerOv  Tasks   Inventory   Alerts            ║
║  │  │         │           │        │     │           │              ║
║  │  │         └───────────┴────────┴─────┴───────────┘              ║
║  │  │                          │                                    ║
║  │  │              ┌───────────▼───────────┐                        ║
║  │  │              │  src/services/api.js  │ ← authFetch()          ║
║  │  │              │  (adds JWT token to   │                        ║
║  │  │              │   every request)      │                        ║
║  │  └──────────────┴───────────┬───────────┘                        ║
║  └──────────────────────────────┼────────────────────────────────── ║
║                                 │                                    ║
║            HTTP Requests ───────┘  (+ WebSocket connection)         ║
║            (JSON over the network)                                   ║
║                                 │                                    ║
║  ┌──────────────────────────────▼─────────────────────────────────┐ ║
║  │                  EXPRESS SERVER (Port 5000)                     │ ║
║  │                     server.js                                   │ ║
║  │                                                                  │ ║
║  │  ┌──────────────────────────────────────────────────────────┐  │ ║
║  │  │                   MIDDLEWARE PIPELINE                    │  │ ║
║  │  │  CORS → JSON Parser → Logger → Auth Check               │  │ ║
║  │  └──────────────────────────────────────────────────────────┘  │ ║
║  │                                                                  │ ║
║  │  ROUTER LAYER (routes/*.js)                                      │ ║
║  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │ ║
║  │  │/api/auth │ │/api/work │ │/api/tasks│ │/api/inv  │  ...     │ ║
║  │  │auth.js   │ │ers       │ │tasks.js  │ │entory    │          │ ║
║  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │ ║
║  │       │            │            │            │                  │ ║
║  │  CONTROLLER LAYER (controllers/*.js)                            │ ║
║  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │ ║
║  │  │authCtrl  │ │workerCtrl│ │taskCtrl  │ │inventory │          │ ║
║  │  │.login    │ │.getAll   │ │.getAll   │ │Ctrl      │          │ ║
║  │  │.register │ │.create   │ │.create   │ │          │          │ ║
║  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │ ║
║  │       │            │            │            │                  │ ║
║  │  MODEL LAYER (models/*.js — Mongoose)                           │ ║
║  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │ ║
║  │  │User.js   │ │Worker.js │ │Task.js   │ │Inventory │          │ ║
║  │  │Schema    │ │Schema    │ │Schema    │ │.js       │          │ ║
║  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │ ║
║  └───────┼────────────┼────────────┼────────────┼────────────────┘ ║
║          │            │            │            │                    ║
║          └────────────┴────────────┴────────────┘                   ║
║                                 │                                    ║
║  ┌──────────────────────────────▼─────────────────────────────────┐ ║
║  │                  MONGODB (Port 27017)                           │ ║
║  │              Database: "smartops"                               │ ║
║  │                                                                  │ ║
║  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐  │ ║
║  │  │ users  │ │workers │ │ tasks  │ │inventory │ │attendance│  │ ║
║  │  │  col.  │ │  col.  │ │  col.  │ │   col.   │ │   col.   │  │ ║
║  │  └────────┘ └────────┘ └────────┘ └──────────┘ └──────────┘  │ ║
║  │                                                                  │ ║
║  │  + alerts  + notifications  + salary  + stocktransactions       │ ║
║  └──────────────────────────────────────────────────────────────── ┘ ║
╚════════════════════════════════════════════════════════════════════════╝
```

---

## 11. Real Code Walkthrough

### 🔍 Tracing a Real Request: Creating a Task

Let's trace `api.createTask({ title: "Check warehouse B", assignedTo: "Rajesh" })` through your **actual files**:

---

**📄 File 1: `src/services/api.js` — Lines 296-302**
```javascript
createTask: async (taskData) => {
  const res = await authFetch(`${API_URL}/tasks`, {
    method: 'POST',              // ← "I want to CREATE something"
    body: JSON.stringify(taskData)  // ← Convert object to text for sending
  });
  return res.json();  // ← Convert server's text response back to object
},
```
> **What's happening:** `authFetch` is called, which automatically grabs your JWT token from `localStorage` and adds it to the request headers before sending. The URL `/api` is just `/api` which Vite's proxy rewrites to `http://localhost:5000/api`.

---

**📄 File 2: `smartops-supervisor/server.js` — Lines 65, 55**
```javascript
const authMiddleware = require('./middleware/auth');
app.use('/api/tasks', authMiddleware, tasksRouter);
//                    ↑               ↑
//                    │               └── Then handle the route
//                    └── First check auth
```
> **What's happening:** Express receives `POST /api/tasks`. It first runs `authMiddleware`, and if that passes, it hands off to `tasksRouter`.

---

**📄 File 3: `smartops-supervisor/middleware/auth.js` — Lines 3-17**
```javascript
module.exports = (req, res, next) => {
  const token = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = decoded;  // ← Now controllers know WHO is asking
  next();              // ← "All good, proceed!"
};
```
> **What's happening:** The token is verified. If valid, `req.user` is set (contains userId, username) and `next()` is called to continue. If invalid, it returns `401` and stops here.

---

**📄 File 4: `smartops-supervisor/routes/tasks.js` — Lines 5-7**
```javascript
router.route('/')
  .get(taskController.getAllTasks)   // ← GET /api/tasks
  .post(taskController.createTask);  // ← POST /api/tasks ← this is our request!
```
> **What's happening:** The router matches `POST /` and calls `createTask` in the controller.

---

**📄 File 5: `smartops-supervisor/controllers/taskController.js`**
```javascript
// (Conceptual — your actual controller does something like this)
createTask: async (req, res) => {
  const task = await Task.create({
    ...req.body,          // ← Data from the frontend
    createdBy: req.user.userId  // ← We know who created it from the JWT!
  });
  res.json({ success: true, data: task });
}
```
> **What's happening:** The controller calls `Task.create()` which uses the Mongoose model to validate and save data to MongoDB.

---

**📄 File 6: `smartops-supervisor/models/Task.js`**
```javascript
// Mongoose validates the data against this schema:
const TaskSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  assignedTo: { type: String },
  status:     { type: String, enum: ['Pending', 'In Progress', 'Completed'] },
  // ...
}, { timestamps: true });
```
> **What's happening:** Mongoose checks if the data matches the schema. If yes → saves to MongoDB. If no → throws a validation error that flows back as a `400` error response.

---

## 12. The CRUD Cheat Sheet

### Quick Reference: HTTP Methods ↔ CRUD Operations ↔ Database Actions

| CRUD | HTTP Method | Example URL | Mongoose Call | What SQL it's like |
|------|-------------|-------------|---------------|---------------------|
| **C**reate | `POST` | `POST /api/workers` | `Worker.create(data)` | `INSERT INTO workers` |
| **R**ead All | `GET` | `GET /api/workers` | `Worker.find()` | `SELECT * FROM workers` |
| **R**ead One | `GET` | `GET /api/workers/123` | `Worker.findById(id)` | `SELECT * WHERE id=123` |
| **U**pdate | `PUT` | `PUT /api/workers/123` | `Worker.findByIdAndUpdate(id, data)` | `UPDATE workers WHERE id=123` |
| **D**elete | `DELETE` | `DELETE /api/workers/123` | `Worker.findByIdAndDelete(id)` | `DELETE FROM workers WHERE id=123` |

### Response Status Codes — What the Server Says Back

| Status Code | Meaning | When it happens |
|-------------|---------|-----------------|
| `200 OK` | Success, here's your data | GET request worked |
| `201 Created` | Success, new item created | POST request worked |
| `400 Bad Request` | Your data was wrong/missing | Validation failed |
| `401 Unauthorized` | No token or invalid token | Not logged in |
| `403 Forbidden` | Logged in, but no permission | Role-based access issue |
| `404 Not Found` | That item doesn't exist | Wrong ID in URL |
| `500 Server Error` | Something broke on the server | Bug in backend code |

### Your API Service Functions → HTTP Method Map

```
api.getWorkers()         → GET    /api/workers
api.createWorker(data)   → POST   /api/workers
api.updateWorker(id, d)  → PUT    /api/workers/:id
api.deleteWorker(id)     → DELETE /api/workers/:id

api.getTasks(params)     → GET    /api/tasks
api.createTask(data)     → POST   /api/tasks
api.updateTask(id, data) → PUT    /api/tasks/:id
api.deleteTask(id)       → DELETE /api/tasks/:id

api.login(credentials)   → POST   /api/auth/login  (no auth needed)
api.register(userData)   → POST   /api/auth/register (no auth needed)
api.getMe()              → GET    /api/auth/me (auth required)

api.getInventory(params) → GET    /api/inventory
api.addItem(data)        → POST   /api/inventory
api.updateItem(id, data) → PUT    /api/inventory/:id
api.deleteItem(id)       → DELETE /api/inventory/:id
```

---

## 🎓 Summary — The Golden Rules

> **Rule 1:** The Frontend **never** touches the database directly. It always asks the Backend.

> **Rule 2:** The Backend **never** trusts the Frontend blindly. It always checks the JWT token first.

> **Rule 3:** The Database **never** takes raw input. Mongoose schemas validate everything first.

> **Rule 4:** Every CRUD operation maps to exactly one HTTP method: POST=Create, GET=Read, PUT=Update, DELETE=Delete.

> **Rule 5:** If anything goes wrong at any step, an error response flows **backwards** through the chain and the user sees a toast notification.

---

## 🗂️ File Quick Reference

| File | Layer | Purpose |
|------|-------|---------|
| [src/services/api.js](./src/services/api.js) | Frontend | Sends ALL HTTP requests to backend |
| [src/App.jsx](./src/App.jsx) | Frontend | Master router — controls which page shows |
| [src/pages/Login.jsx](./src/pages/Login.jsx) | Frontend | Login form, stores JWT token |
| [src/components/ProtectedRoute.jsx](./src/components/ProtectedRoute.jsx) | Frontend | Blocks unauthenticated users |
| [smartops-supervisor/server.js](./smartops-supervisor/server.js) | Backend | App entry point, mounts all routes |
| [smartops-supervisor/middleware/auth.js](./smartops-supervisor/middleware/auth.js) | Backend | JWT verification guard |
| [smartops-supervisor/routes/tasks.js](./smartops-supervisor/routes/tasks.js) | Backend | URL-to-controller mapping for tasks |
| [smartops-supervisor/routes/auth.js](./smartops-supervisor/routes/auth.js) | Backend | URL-to-controller mapping for auth |
| [smartops-supervisor/models/Worker.js](./smartops-supervisor/models/Worker.js) | Database | Defines worker document shape |
| [smartops-supervisor/config/db.js](./smartops-supervisor/config/db.js) | Database | Connects to MongoDB with retry logic |

---

*Generated for SmartOps Supervisor Dashboard — June 2026*
*Stack: React + Vite (Frontend) · Node.js + Express (Backend) · MongoDB + Mongoose (Database)*

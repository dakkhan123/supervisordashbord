# RUNBOOK: SmartOps Startup & Operations

This document describes the operations architecture, ports, dependency mapping, diagnostics, and recovery runbooks for the SmartOps Inventory Management system.

---

## 1. System Architecture & Ports

The application consists of a React frontend (built with Vite) and a Node.js Express backend (connected to MongoDB).

```
                      +------------------+
                      |  Web Browser     |
                      |  (localhost)     |
                      +--------+---------+
                               |
                   HTTP / WebSocket (HMR)
                               |
                               v
                      +--------+---------+
                      |   Vite Server    |
                      |  localhost:5173  |
                      +--------+---------+
                               |
                     Proxy (/api/* requests)
                               |
                               v
                      +--------+---------+
                      |  Express Server  |
                      |  localhost:5000  |
                      +--------+---------+
                               |
                         Mongoose TCP
                               |
                               v
                      +--------+---------+
                      |   MongoDB Local  |
                      |  localhost:27017 |
                      +------------------+
```

### Port Mappings
*   **Vite Dev Server**: `5173` (Frontend)
*   **Express API Server**: `5000` (Backend)
*   **MongoDB**: `27017` (Database)
*   **VS Code Live Server (Go Live)**: `5500` (Proxied to `5173`)

---

## 2. Automatic Startup sequence

When you open the project folder in VS Code, the following sequence occurs automatically if automatic tasks are allowed:

1.  **Task Launch**: VS Code starts `node scripts/startup.js`.
2.  **Environment Check**: Checks for `server/.env`. If missing, copies `server/.env.example` to create it.
3.  **Dependency Verification**: Confirms `node_modules` folders exist. Installs dependencies (`npm install`) automatically if missing.
4.  **Port Conflict Resolution**: Scan ports `5000` and `5173`. If any process is running on these ports, they are killed immediately.
5.  **MongoDB Service Check**: Pings port `27017`. If MongoDB is down and running on Windows, it runs `net start MongoDB` to automatically launch the database service.
6.  **Concurrent Execution**: Spawns Vite and Express, prefixing outputs with color-coded labels (`SERVER |` in yellow, `FRONTEND |` in cyan).

---

## 3. Operations Runbook & Recovery

### Diagnostic Flowchart
Follow these steps if the application fails to start or load:

```
                  +--------------------------------+
                  |  Is port 5173 responding?      |
                  +---------------+----------------+
                                  |
                        +---------+---------+
                     No |                   | Yes
                        v                   v
          +-------------+-------+     +-----+----------------+
          | Is Vite running?    |     | Is port 5000 healthy?|
          | Check terminal log. |     +-----+----------------+
          +---------------------+           |
                                  +---------+---------+
                               No |                   | Yes
                                  v                   v
                     +------------+------+    +-------+--------+
                     | Is MongoDB running|    | App is fully   |
                     | on port 27017?    |    | healthy.       |
                     +------------+------+    +----------------+
                                  |
                        +---------+---------+
                     No |                   | Yes
                        v                   v
             +----------+---------+  +------+----------+
             | Run:               |  | Check server    |
             | net start MongoDB  |  | log diagnostics |
             +--------------------+  +-----------------+
```

### Port Conflicts (EADDRINUSE)
If you get a port conflict error when starting outside the startup script:
*   **Windows**:
    ```cmd
    :: Kill backend port 5000
    for /f "tokens=5" %a in ('netstat -aon ^| findstr ":5000 " ^| findstr "LISTENING"') do taskkill /PID %a /F
    
    :: Kill frontend port 5173
    for /f "tokens=5" %a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do taskkill /PID %a /F
    ```
*   **Linux/macOS**:
    ```bash
    kill -9 $(lsof -t -i:5000)
    kill -9 $(lsof -t -i:5173)
    ```

### MongoDB Offline
If the terminal log displays `WARNING: MongoDB connection test failed`:
1.  Verify the service status:
    *   **Windows (Services CLI)**: `sc query MongoDB`
    *   **Windows (GUI)**: Press `Win+R`, type `services.msc`, locate **MongoDB Server**, and verify it is running.
2.  Start MongoDB manually:
    *   **Administrator Command Prompt**:
        ```cmd
        net start MongoDB
        ```
    *   **Manual Mongod**:
        ```cmd
        mongod --dbpath "C:\data\db"
        ```

### CORS Issues (Blocked Requests)
If the browser console logs a CORS error (origin mismatch):
*   The backend config dynamically resolves all `localhost` and `127.0.0.1` requests.
*   Ensure that you are visiting the application via `http://localhost:5173` or through the Live Server proxy `http://127.0.0.1:5500`.
*   Avoid using custom hosts (like custom domains in hosts file) unless added to `server/server.js` CORS settings.

---

## 4. Manual Operations

If you wish to bypass automation:
*   Start the whole application manually from terminal:
    ```bash
    npm start
    ```
*   Run the startup controller manually:
    ```bash
    node scripts/startup.js
    ```
*   Run services in separate terminals:
    *   Backend: `node server/server.js`
    *   Frontend: `npm run dev:frontend`

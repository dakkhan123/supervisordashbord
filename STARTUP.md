# SmartOps — Startup Guide

SmartOps is configured to be fully **reopen-safe** and **one-click runnable**. When you open the workspace in VS Code, the startup controller launches all services automatically in the background.

---

## One-Click Startup (Recommended)

1.  **Open the folder** in VS Code.
2.  If prompted to **Allow Automatic Tasks**, click **Allow**.
    *   *If not prompted, open Command Palette (`Ctrl+Shift+P`), type `Tasks: Manage Automatic Tasks in Folder`, and choose `Allow Automatic Tasks`.*
3.  The startup script will automatically check environment variables, verify dependencies, clear ports, ensure MongoDB is running, and spin up frontend and backend services.
4.  Click **Go Live** at the bottom of the editor. Live Server will open the browser at `http://localhost:5500`, which is configured to proxy all traffic directly to the Vite frontend server at `localhost:5173`.

---

## Alternative Startup Methods

### Option A — Terminal Startup (Single Command)
Open a terminal in the project root and run:
```bash
npm start
```
This runs the startup controller script (`node scripts/startup.js`) which manages ports, database status, and runs both servers concurrently.

### Option B — Run & Debug Side Panel
1.  Open the Run & Debug side panel in VS Code (`Ctrl+Shift+D`).
2.  Select **Launch App (Startup Script)** from the dropdown.
3.  Click the green Play button.

### Option C — Double-click Launcher
Double-click:
```
start.bat
```
This launcher script validates Node.js, frees the ports, and runs the frontend and backend in separate command prompt windows.

---

## Port Map & Health Check

| Service | Port / URL | Status Check |
|---|---|---|
| **Vite Dev Server** | `http://localhost:5173` | Main client interface |
| **Express Backend** | `http://localhost:5000` | Health check: `http://localhost:5000/health` |
| **Live Server Proxy** | `http://localhost:5500` | Go Live entry point |
| **MongoDB Database** | `http://localhost:27017` | Checked automatically at startup |

---

## Troubleshooting

### `ERR_CONNECTION_REFUSED`
This means the server processes are not running. 
1. Open terminal and run `node scripts/startup.js` or `npm start`.
2. Ensure you allowed automatic tasks in VS Code settings.

### Database Connection Failure
If the backend logs connection failure:
*   Make sure MongoDB service is running:
    *   **Windows**: Run Command Prompt as administrator and execute `net start MongoDB`.
    *   **MacOS/Linux**: Run `brew services start mongodb-community` or `sudo systemctl start mongod`.

### Port Already In Use
If another process blocks port 5000 or 5173, the startup controller (`startup.js`) will **automatically kill** the conflicting process and free the port. If you are starting the apps individually, use the instructions in [RUNBOOK.md](file:///c:/Users/HP/OneDrive/Desktop/Demo/RUNBOOK.md) to free them manually.

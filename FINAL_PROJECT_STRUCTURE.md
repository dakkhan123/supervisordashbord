# Final Project Structure — smartops-supervisor

This document illustrates the final restructured layout of the `smartops-supervisor` backend folder.

```
smartops-supervisor/
├── models/
│   ├── Alert.js                 # Preserved Alerts model
│   ├── Attendance.js            # [NEW] Worker attendance record
│   ├── Escalation.js            # [NEW] Supervisor escalation logs
│   ├── Inventory.js             # Inventory catalog item
│   ├── Notification.js          # Preserved Notification model
│   ├── Report.js                # [NEW] Administrative report data
│   ├── RestockRequest.js        # Restock replenishment request log
│   ├── Salary.js                # [NEW] Worker monthly salaries
│   ├── StockTransaction.js      # Stock movements (formerly InventoryHistory)
│   ├── Task.js                  # [NEW] Worker task tracking
│   └── Worker.js                # [NEW] Worker staff registry
│
├── routes/
│   ├── attendance.js            # [NEW] Attendance & Worker CRUD
│   ├── escalations.js           # [NEW] Escalation CRUD & Socket broadcast
│   ├── inventory.js             # Inventory, history, & restock request CRUD
│   ├── reports.js               # Report, alert, & notification endpoints
│   ├── salary.js                # [NEW] Salary management CRUD
│   └── tasks.js                 # [NEW] Task tracking CRUD
│
├── middleware/
│   └── auth.js                  # [NEW] JWT token verification middleware
│
├── socket/
│   └── escalationSocket.js      # [NEW] Real-time WebSockets coordinator
│
├── .env                         # Environment configurations (MONGO_URI, PORT)
├── package.json                 # Node dependencies (bcryptjs, socket.io, express)
├── package-lock.json            # Node dependency locking
├── seed.js                      # Seeding script for DB initialization
└── server.js                    # Combined app entrypoint and HTTP/WS server
```

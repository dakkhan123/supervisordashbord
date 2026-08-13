# SmartOps — Industrial Factory Supervisor & Worker Operations Dashboard
## Complete Technical Project Documentation

---

### 1. Project Introduction
**SmartOps** is an end-to-end industrial shopfloor operations, workforce management, inventory tracking, and performance analytics platform. Built specifically for manufacturing units, industrial plants, and warehousing facilities (such as Unit Pune-A12), SmartOps bridges the gap between factory supervisors and plant floor workers. It automates registration workflows, task assignments, GPS-assisted attendance logging, payroll calculations, inventory stock movement, low stock alerts, and interactive performance reports.

---

### 2. Problem Statement
Traditional manufacturing units and factory floors face significant operational inefficiencies:
1. **Manual Worker Onboarding & Buddy Clocking**: Unverified paper registrations lead to proxy attendance, unvetted access, and incorrect salary records.
2. **Lack of Task Transparency**: Task assignments dispatched verbally or via paper ledgers result in delayed completion, unassigned accountability, and untracked overdue tasks.
3. **Disconnected Payroll & Attendance**: Manual attendance registers require hours of monthly reconciliation for overtime, bonuses, leaves, and salary calculations.
4. **Opaque Inventory & Stock Movements**: Untracked material inflows and outflows lead to stockouts, delayed production runs, and unverified asset valuations.
5. **Static & Unverifiable Reports**: Management dashboards relying on static, hardcoded, or aggregated summaries fail to provide auditability into source transactions.

---

### 3. Key Objectives
- **Secure Self-Registration & Approval**: Implement a 2-step worker onboarding flow with Gmail SMTP 6-digit OTP verification and supervisor branch-isolated review.
- **Role-Based Workflows**: Provide separate customized consoles for **Supervisors** (monitoring, task creation, attendance oversight, payroll, inventory control) and **Workers** (task execution, check-in/out, leave requests, payslip view).
- **100% Real Database Persistence**: Eliminate all fake, mock, and hardcoded values. Ensure every metric tile, chart bar, and report is derived directly from MongoDB records.
- **Interactive Metric Auditability**: Enable clickable drill-down breakdown modals for every KPI tile, category chart, and leaderboard row to inspect underlying MongoDB transactions.
- **Automated Payroll & Attendance Integration**: Synchronize daily attendance logs, overtime hours, and leave approvals into real-time salary payslip generation.

---

### 4. Project Scope
- **Target Facilities**: Manufacturing plants, industrial units, assembly lines, warehouse facilities.
- **Supported User Roles**: `Supervisor`, `Worker`, `Owner`, `Manager`, `Admin`.
- **Core Operations Covered**: Worker Onboarding, Task Management, Attendance Logging, Leave Requests, Payroll Management, Inventory Tracking, Low Stock Alerts, Inventory Analytics, Worker Performance Leaderboards.

---

### 5. User Roles & Permissions Matrix

| Feature / Module | Worker | Supervisor | Owner / Admin |
|---|---|---|---|
| **Self-Registration & OTP** | Submit & Verify OTP | N/A | N/A |
| **Pending Registration Review** | View Own Status | Review, Assign Salary & Approve/Reject | Review & Approve/Reject |
| **Dashboard Access** | Worker Console | Supervisor Console | Full Executive Dashboard |
| **Task Management** | View Assigned & Update Progress | Create, Assign & Track All Tasks | View & Manage All Tasks |
| **Attendance Logging** | Self Check-in / Check-out | View Attendance Logs & Heatmap | View & Export All Logs |
| **Leave Requests** | Apply for Leave | Review, Approve / Reject | Review & Approve / Reject |
| **Payroll & Salary** | View Personal Payslip | Manage Salary, Overtime & Bonuses | Full Financial Oversight |
| **Inventory & Stock** | Scan Item QR | Full Stock Management & Add Items | Full Stock Management |
| **Reports & Analytics** | N/A | Full Interactive Reports & CSV/PDF Export | Full Reports & PDF/CSV Export |

---

### 6. Main System Features

1. **Worker Registration Portal & OTP Verification**:
   - 2-Step worker onboarding via form submission and Gmail SMTP 6-digit email OTP.
   - Pending registration queue preventing unapproved logins until supervisor approval and salary assignment.
2. **Supervisor Branch Review & Approval**:
   - Supervisors review pending registrations for their assigned branch, assign monthly base salary, generate unique Employee ID (`EMP-XXXX`), and activate the account.
3. **GPS/Location Attendance Logging**:
   - Worker interactive popup for daily check-in and check-out with automatic hour calculation.
   - Real-time attendance heatmap grid for supervisors.
4. **Task Assignment & Progress Tracking**:
   - Supervisors assign tasks with priority (Low, Medium, High, Urgent), due date, and instructions.
   - Workers update task status (`Pending` → `In Progress` → `Completed`) with completion notes.
5. **Leave Request Management**:
   - Workers apply for Casual, Sick, or Emergency leave.
   - Supervisors review leave history, view pending count, and approve or reject with comments.
6. **Automated Payroll & Payslips**:
   - Calculates base salary, overtime earnings, performance bonuses, and tax/PF deductions based on attendance records.
   - Generates downloadable/printable worker payslips.
7. **Inventory Catalog & Stock Transactions**:
   - Real-time stock movement logging (`Inflow` / `Outflow`), unit pricing, location tracking, and GST rate calculation.
   - Built-in QR Code Scanner for shopfloor items.
8. **Interactive Inventory & Performance Analytics**:
   - 100% database-driven stat tiles and charts.
   - Clickable drill-down breakdown modals ("Where that number came from") displaying source MongoDB records and formula breakdowns.
   - Export filtered reports to CSV and PDF.

---

### 7. Technology Stack

- **Frontend**: React 18, Vite 8, Vanilla CSS (Design Tokens, Glassmorphism, Theme Variables), React Router DOM v6, Lucide / Material Symbols Icons, Socket.io-client.
- **Backend**: Node.js, Express.js, Mongoose ODM, JSON Web Token (JWT), BcryptJS, Nodemailer, Socket.io.
- **Database**: MongoDB / MongoDB Atlas Cloud Cluster.
- **Email Service**: Gmail SMTP Transporter (Port 465 SSL).

---

### 8. System Architecture

```
[ React 18 Frontend Console (Vite 8 / Port 5173) ]
                       │
                       │ REST API Calls & WebSocket Events
                       ▼
[ Express.js REST API Server (Node.js / Port 5000) ]
       │               │               │
       │ Mongoose      │ JWT / Bcrypt  │ Nodemailer
       ▼               ▼               ▼
[ MongoDB Cloud ]  [ Auth Guard ]  [ Gmail SMTP Service ]
```

---

### 9. Database Design & Schemas

#### A. User Model (`User.js`)
- `username`: String (Unique, Lowercase, Trimmed)
- `email`: String (Unique, Lowercase, Trimmed)
- `password`: String (Bcrypt Hash)
- `role`: Enum (`'Worker'`, `'Supervisor'`, `'Owner'`, `'Manager'`, `'Admin'`)
- `status`: Enum (`'Active'`, `'Inactive'`, `'Pending'`)
- `branch` / `unit`: String
- `employeeId`: String (Unique Employee Code)
- `resetPasswordOTP`: String (SHA256 Hash)
- `resetPasswordOTPExpire`: Date

#### B. Worker Model (`Worker.js`)
- `name`: String
- `email`: String
- `username`: String
- `employeeId`: String
- `phone`: String (10 Digits)
- `department`: String
- `branch` / `assignedSite`: String
- `salary`: Number
- `status`: Enum (`'Active'`, `'Inactive'`)
- `user`: ObjectId (Ref to `User`)

#### C. PendingWorker Model (`PendingWorker.js`)
- `fullName`: String
- `username`: String
- `email`: String
- `passwordHash`: String
- `mobile`: String
- `branch`: String
- `department`: String
- `joiningDate`: Date
- `status`: Enum (`'Pending'`, `'Approved'`, `'Rejected'`)
- `emailVerified`: Boolean

#### D. StockTransaction Model (`StockTransaction.js`)
- `item`: String
- `sku`: String
- `type`: Enum (`'in'`, `'out'`)
- `qty`: Number
- `gst`: Number
- `op`: String (Operator)
- `loc`: String
- `val`: Number (Base Value)
- `date`: Date

---

### 10. API Specification Highlights

- `POST /api/auth/register-worker/send-otp`: Dispatches 6-digit email OTP via Gmail SMTP.
- `POST /api/auth/register-worker/verify`: Verifies OTP code and creates `PendingWorker` record.
- `GET /api/workers/pending-registrations`: Retrieves branch-isolated pending worker applications.
- `POST /api/workers/approve-registration`: Approves worker, assigns salary, generates employee ID, and creates active `User` & `Worker` records.
- `POST /api/auth/login`: Authenticates active users, returns JWT token. Blocked for pending/rejected applicants.
- `POST /api/auth/forgot-password/send-otp`: Sends 6-digit password reset OTP.
- `POST /api/auth/forgot-password/reset`: Verifies reset OTP and updates hashed password.
- `GET /api/reports/kpi`: Fetches real-time inventory statistics from MongoDB.
- `GET /api/performance/kpi`: Fetches real-time worker productivity and task performance metrics.

---

### 11. Installation & Environment Configuration

#### Environment Variables (`backend/.env`)
```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/supervisordashboard
JWT_SECRET=smartops_secure_jwt_secret_key_2026
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM="SmartOps Security" <your_gmail_address@gmail.com>
```

#### Commands to Run Locally
```bash
# Install dependencies
npm install --prefix backend
npm install --prefix frontend

# Launch unified development environment
node scripts/startup.js
```

---

### 12. Security Audit & Compliance
- **Zero Plain-Text Passwords**: All passwords stored using `bcrypt.genSalt(10)` hashing.
- **SHA256 OTP Storage**: Registration and reset OTPs stored as SHA256 hashes (`hashOTP`), expiring automatically.
- **Branch Authorization Isolation**: Supervisors can only review and approve worker registrations belonging to their assigned branch.
- **Secret Protection**: `.env` is listed in `.gitignore` and never committed to source control.

---

### 13. Deployment Readiness
- **Production Build**: Verified with `npm run build --prefix frontend` (succeeded with zero compilation errors).
- **Environment Isolation**: Supports environment-based API URLs (`VITE_API_URL` / `PORT`).
- **Database Persistence**: Connected to MongoDB Cloud Atlas Cluster.

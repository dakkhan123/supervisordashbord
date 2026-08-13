# SmartOps — Project Viva & Presentation Summary Guide

---

### 1. Slide 1: Project Overview & Title
- **Project Title**: SmartOps — Industrial Factory Supervisor & Worker Operations Dashboard
- **Target Domain**: Industrial Shopfloor Automation, Workforce Management & Logistics
- **Target Facility**: Manufacturing Plants, Assembly Units (e.g., Unit Pune-A12)
- **Key Stack**: React 18, Node.js, Express, MongoDB Atlas, Gmail SMTP, Socket.io

---

### 2. Slide 2: Problem & Existing Challenges
- **Manual Attendance & Proxy Clocking**: Unverified paper registers lead to ghost workers and inaccurate payroll.
- **Untracked Tasks & Delays**: Dispatched verbal instructions result in delayed task completion and zero accountability.
- **Stock Discrepancies**: Inventory inflows/outflows managed manually lead to stockouts and production line halts.
- **Unauditable Static Dashboards**: Traditional dashboards use static summaries without auditability into source transactions.

---

### 3. Slide 3: Proposed SmartOps Solution
- **2-Step Verified Worker Onboarding**: Worker registers → Verifies 6-digit email OTP (via Gmail SMTP) → Queued for Supervisor approval.
- **Branch-Isolated Supervisor Approval**: Supervisor reviews applicant details, assigns monthly salary (INR), generates unique Employee ID (`EMP-XXXX`), and activates account.
- **100% Real Database Persistence**: ZERO fake/mock data. Every stat tile, chart, and table is powered directly by MongoDB.
- **Interactive Metric Auditability**: Clicking ANY metric tile or chart element opens a breakdown modal showing exact MongoDB records and mathematical formulas ("Where that number came from").
- **Integrated Payroll & Attendance**: Daily check-in/out and leave approvals automatically feed into worker salary payslips.

---

### 4. Slide 4: System Architecture & Workflow

```
[ Worker App / Portal ] ──( 6-Digit Email OTP )──► [ Pending Request Queue ]
                                                              │
                                                   ( Supervisor Approval & Salary )
                                                              ▼
[ Worker Active Console ] ◄──( Login & JWT Token )──► [ MongoDB Cloud Database ]
```

---

### 5. Slide 5: Key Supervisor Capabilities
1. **Pending Worker Review**: View applicant details, assign salary, approve/reject applications.
2. **Task Creation & Tracking**: Assign high-priority tasks with due dates to specific workers.
3. **Attendance Heatmap**: Monitor daily presence (Present/Absent/Leave) across all plant workers.
4. **Payroll Management**: Process monthly salaries, overtime bonuses, and generate worker payslips.
5. **Inventory Analytics**: Track Inflows, Outflows, GST calculations, and scan item QR codes.

---

### 6. Slide 6: Key Worker Capabilities
1. **Self-Registration**: Easy 2-step onboarding with mobile photo upload and email OTP verification.
2. **Interactive Check-In / Check-Out**: One-tap daily attendance logging with location tracking.
3. **Task Progress Updates**: View assigned tasks and update status (`In Progress` / `Completed`).
4. **Leave Application**: Submit Casual, Sick, or Emergency leave requests with instant status updates.
5. **Payslip Download**: Access monthly salary slips with earnings and deduction breakdowns.

---

### 7. Slide 7: Security & Technical Highlights
- **Password Protection**: Passwords hashed with `bcrypt.genSalt(10)`.
- **OTP Security**: 6-digit numeric OTPs stored as SHA256 hashes (`hashOTP`) with 10-minute auto-expiry.
- **Authorization Guard**: Role-based access (`Supervisor` vs `Worker`) enforced via JWT middleware.
- **Export Capabilities**: Download custom date-range inventory and performance reports in CSV & PDF.

---

### 8. Slide 8: Live Demonstration Checklist for Evaluators
1. **Demo 1: Worker Self-Registration**: Register a new worker, verify OTP received via email, show pending login block.
2. **Demo 2: Supervisor Approval**: Log in as Supervisor, approve worker with ₹22,500 salary assignment, show account activation.
3. **Demo 3: Worker Login & Task Execution**: Log in as approved worker, check in for attendance, complete an assigned task.
4. **Demo 4: Interactive Reports & Auditability**: Open Inventory Reports, click "Total Inflow" or "Net Stock Change", show underlying source MongoDB records in drill-down modal.

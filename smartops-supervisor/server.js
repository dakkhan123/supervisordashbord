const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const net = require('net');
const mongoose = require('mongoose');
const path = require('path');
const http = require('http');
const socketManager = require('./socket/escalationSocket');

// Load environment variables using __dirname so it works when invoked from anywhere
dotenv.config({ path: path.join(__dirname, '.env') });

// Database Connection
const connectDB = require('./config/db');
connectDB();

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
socketManager.init(server);

// CORS Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
});

// Import Consolidated Routers
const { router: inventoryRouter, historyRouter, restockRouter } = require('./routes/inventory');
const { router: reportsRouter, alertsRouter, notificationsRouter } = require('./routes/reports');
const tasksRouter = require('./routes/tasks');
const { router: attendanceRouter, workersRouter } = require('./routes/attendance');
const salaryRouter = require('./routes/salary');
const escalationsRouter = require('./routes/escalations');

// Mount Routers
app.use('/api/inventory', inventoryRouter);
app.use('/api/history', historyRouter);
app.use('/api/restock-requests', restockRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/workers', workersRouter);
app.use('/api/salary', salaryRouter);
app.use('/api/escalations', escalationsRouter);

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date(), port: server.address().port });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date(), port: server.address().port });
});

// Inline Error Handler Middleware (formerly middleware/errorHandler.js)
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Server Error'
  });
};
app.use(errorHandler);

// Port conflict detection
function isPortFree(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.close(() => resolve(true)))
      .listen(port, '127.0.0.1');
  });
}

async function findFreePort(startPort) {
  let port = startPort;
  while (!(await isPortFree(port))) {
    console.warn(`⚠️  Port ${port} is in use, trying ${port + 1}...`);
    port++;
  }
  return port;
}

// Start HTTP + Socket.io Server
const DESIRED_PORT = parseInt(process.env.PORT || '5000', 10);

findFreePort(DESIRED_PORT).then((PORT) => {
  server.listen(PORT, () => {
    console.log(`✅ Server running in dev mode on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    if (PORT !== DESIRED_PORT) {
      console.warn(`⚠️  NOTE: Started on port ${PORT} instead of ${DESIRED_PORT} (port was in use).`);
    }
  });
});

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('✅ Server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const net = require('net');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables — use __dirname so this works when invoked from any cwd
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to Database
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    // Allow localhost or 127.0.0.1 on any port
    if (/^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
});

// Route Bindings
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/history', require('./routes/history'));
app.use('/api/alerts', require('./routes/alerts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/restock-requests', require('./routes/restockRequests'));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date(), port: server ? server.address().port : PORT });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date(), port: server ? server.address().port : PORT });
});

// Error handling middleware
app.use(errorHandler);

// ── Port conflict detection ──────────────────────────────────────────────────
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

// ── Start server ──────────────────────────────────────────────────────────────
let server;
const DESIRED_PORT = parseInt(process.env.PORT || '5000', 10);

findFreePort(DESIRED_PORT).then((PORT) => {
  server = app.listen(PORT, () => {
    console.log(`✅ Server running in dev mode on port ${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/health`);
    if (PORT !== DESIRED_PORT) {
      console.warn(`⚠️  NOTE: Started on port ${PORT} instead of ${DESIRED_PORT} (port was in use).`);
      console.warn(`   Update your frontend proxy target if needed.`);
    }
  });
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close(() => {
      console.log('✅ Server closed.');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after timeout.');
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));


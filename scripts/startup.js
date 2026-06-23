import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// ANSI color helpers
const colors = {
  reset: '\x1b[0m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
};

function log(prefix, message, color = colors.reset) {
  const lines = message.toString().trim().split('\n');
  for (const line of lines) {
    if (line.trim()) {
      console.log(`${color}${prefix}${colors.reset} ${line}`);
    }
  }
}

// 1. Copy .env if missing
function ensureEnv() {
  const envPath = path.join(rootDir, 'backend', '.env');
  const envExamplePath = path.join(rootDir, 'backend', '.env.example');
  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      console.log(`${colors.green}[SYSTEM]${colors.reset} Copying backend/.env.example to backend/.env...`);
      fs.copyFileSync(envExamplePath, envPath);
    } else {
      console.log(`${colors.red}[SYSTEM] ERROR:${colors.reset} Neither backend/.env nor backend/.env.example exists!`);
    }
  } else {
    console.log(`${colors.green}[SYSTEM]${colors.reset} backend/.env file found.`);
  }
}

// 2. Validate and install dependencies
function ensureDependencies() {
  const rootNodeModules = path.join(rootDir, 'frontend', 'node_modules');
  const serverNodeModules = path.join(rootDir, 'backend', 'node_modules');

  if (!fs.existsSync(rootNodeModules)) {
    console.log(`${colors.green}[SYSTEM]${colors.reset} Frontend node_modules not found. Installing frontend dependencies...`);
    execSync('npm install', { cwd: path.join(rootDir, 'frontend'), stdio: 'inherit' });
  } else {
    console.log(`${colors.green}[SYSTEM]${colors.reset} Frontend dependencies already installed.`);
  }

  if (!fs.existsSync(serverNodeModules)) {
    console.log(`${colors.green}[SYSTEM]${colors.reset} Server node_modules not found. Installing backend dependencies...`);
    execSync('npm install', { cwd: path.join(rootDir, 'backend'), stdio: 'inherit' });
  } else {
    console.log(`${colors.green}[SYSTEM]${colors.reset} Backend dependencies already installed.`);
  }
}

// 3. Clear port conflicts
function killPort(port) {
  try {
    if (process.platform === 'win32') {
      const stdout = execSync(`netstat -ano | findstr :${port}`).toString();
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0' && parseInt(pid, 10) > 0) {
            console.log(`${colors.yellow}[SYSTEM] Port ${port} is in use. Killing process PID ${pid}...${colors.reset}`);
            execSync(`taskkill /PID ${pid} /F`);
          }
        }
      }
    } else {
      try {
        execSync(`lsof -t -i:${port} | xargs kill -9`, { stdio: 'ignore' });
      } catch (e) {
        execSync(`fuser -k ${port}/tcp`, { stdio: 'ignore' });
      }
      console.log(`${colors.yellow}[SYSTEM] Port ${port} cleared.${colors.reset}`);
    }
  } catch (err) {
    // If no process is running, netstat will return non-zero exit code which throws an error. We safe-ignore it.
  }
}

// 4. Verify/Start MongoDB Service
function checkMongo() {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    })
    .once('timeout', () => {
      socket.destroy();
      resolve(false);
    })
    .once('error', () => {
      socket.destroy();
      resolve(false);
    })
    .connect(27017, '127.0.0.1');
  });
}

async function ensureMongo() {
  console.log(`${colors.green}[SYSTEM]${colors.reset} Checking MongoDB connection on port 27017...`);
  const isRunning = await checkMongo();
  if (!isRunning) {
    console.log(`${colors.yellow}[SYSTEM] MongoDB is not running on port 27017.${colors.reset}`);
    if (process.platform === 'win32') {
      console.log(`${colors.green}[SYSTEM] Attempting to start MongoDB Windows Service...`);
      try {
        execSync('net start MongoDB', { stdio: 'inherit' });
        // Wait up to 3 seconds for it to start binding
        for (let i = 0; i < 6; i++) {
          await new Promise(r => setTimeout(r, 500));
          if (await checkMongo()) {
            console.log(`${colors.green}[SYSTEM] MongoDB successfully started.${colors.reset}`);
            return;
          }
        }
      } catch (err) {
        console.log(`${colors.red}[SYSTEM] Could not start MongoDB service automatically.${colors.reset}`);
      }
    }
    console.log(`${colors.red}[SYSTEM] WARNING: MongoDB connection test failed. Make sure your database is running!${colors.reset}`);
  } else {
    console.log(`${colors.green}[SYSTEM] MongoDB is online and listening.${colors.reset}`);
  }
}

// 5. Concurrent process runner
async function startApp() {
  console.log(`\n${colors.magenta}====================================================${colors.reset}`);
  console.log(`${colors.magenta}         SmartOps Application Launcher              ${colors.reset}`);
  console.log(`${colors.magenta}====================================================${colors.reset}\n`);

  ensureEnv();
  ensureDependencies();
  
  console.log(`${colors.green}[SYSTEM]${colors.reset} Ensuring ports 5000 and 5173 are free...`);
  killPort(5000);
  killPort(5173);

  await ensureMongo();

  console.log(`\n${colors.green}[SYSTEM] Starting backend and frontend processes...${colors.reset}\n`);

  // Start backend
  const backend = spawn('node', ['backend/server.js'], { 
    cwd: rootDir,
    env: { ...process.env }
  });

  // Start frontend
  const frontend = spawn('npx', ['vite', '--port', '5173', '--strictPort', 'false'], { 
    cwd: path.join(rootDir, 'frontend'),
    shell: true
  });

  // Pipe backend outputs
  backend.stdout.on('data', (data) => log('SERVER  |', data, colors.yellow));
  backend.stderr.on('data', (data) => log('SERVER  |', data, colors.red));

  // Pipe frontend outputs
  frontend.stdout.on('data', (data) => log('FRONTEND|', data, colors.cyan));
  frontend.stderr.on('data', (data) => log('FRONTEND|', data, colors.red));

  // Handle process shutdown
  const shutdown = (signal) => {
    console.log(`\n${colors.magenta}[SYSTEM] Received ${signal}. Shutting down child processes...${colors.reset}`);
    backend.kill();
    frontend.kill();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  backend.on('close', (code) => {
    console.log(`${colors.red}[SYSTEM] Backend process exited with code ${code}.${colors.reset}`);
    frontend.kill();
    process.exit(code || 1);
  });

  frontend.on('close', (code) => {
    console.log(`${colors.red}[SYSTEM] Frontend process exited with code ${code}.${colors.reset}`);
    backend.kill();
    process.exit(code || 1);
  });
}

startApp().catch(err => {
  console.error(`${colors.red}[SYSTEM] Unexpected startup error:${colors.reset}`, err);
  process.exit(1);
});

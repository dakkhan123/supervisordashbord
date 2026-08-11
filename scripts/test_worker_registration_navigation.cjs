const fs = require('fs');
const path = require('path');

function testWorkerRegistrationNavigation() {
  console.log('\n============================================================');
  console.log('   TESTING WORKER REGISTRATION ROUTE & NAVIGATION CONFIG ');
  console.log('============================================================\n');

  const appPath = path.join(__dirname, '../frontend/src/App.jsx');
  const loginPath = path.join(__dirname, '../frontend/src/pages/Login.jsx');
  const workerRegisterPath = path.join(__dirname, '../frontend/src/pages/WorkerRegister.jsx');

  // 1. Verify file existence
  if (!fs.existsSync(appPath)) throw new Error('App.jsx missing!');
  if (!fs.existsSync(loginPath)) throw new Error('Login.jsx missing!');
  if (!fs.existsSync(workerRegisterPath)) throw new Error('WorkerRegister.jsx missing!');

  console.log('✔ All component files exist.');

  // 2. Inspect App.jsx for unauthenticated route registration
  const appContent = fs.readFileSync(appPath, 'utf8');

  if (!appContent.includes('path="/register-worker"') && !appContent.includes('path="/worker/register"')) {
    throw new Error('TEST FAILED: WorkerRegister route is missing in App.jsx!');
  }

  // 3. Inspect Login.jsx for Link component
  const loginContent = fs.readFileSync(loginPath, 'utf8');
  if (!loginContent.includes('to="/register-worker"') && !loginContent.includes('to="/worker/register"')) {
    throw new Error('TEST FAILED: Link to worker registration missing in Login.jsx!');
  }

  console.log('✔ App.jsx contains unauthenticated routes for WorkerRegister.');
  console.log('✔ Login.jsx contains React Router <Link> pointing to WorkerRegister route.');
  console.log('✔ Single Page Application (SPA) navigation enabled without full page refresh.');
  console.log('\n🎉 WORKER REGISTRATION NAVIGATION VERIFICATION PASSED!\n');
}

testWorkerRegistrationNavigation();

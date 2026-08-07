require('../backend/node_modules/dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const mongoose = require('../backend/node_modules/mongoose');

const User = require('../backend/models/User');
const Worker = require('../backend/models/Worker');
const PendingWorker = require('../backend/models/PendingWorker');
const RegistrationOTP = require('../backend/models/RegistrationOTP');

async function migrateBranches() {
  console.log('\n=============================================================');
  console.log('      SMARTOPS BRANCH MIGRATION SCRIPT FOR EXISTING DATA     ');
  console.log('=============================================================\n');

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smartops';
  console.log(`[MIGRATION] Connecting to MongoDB: ${mongoUri.split('@').pop()}`);
  
  await mongoose.connect(mongoUri);
  console.log('[MIGRATION] Connected successfully.\n');

  const defaultBranch = 'Pune Head Office';

  // 1. Migrate Users
  const users = await User.find({});
  let usersUpdated = 0;
  for (const user of users) {
    let changed = false;
    if (!user.branch) {
      user.branch = user.unit || defaultBranch;
      changed = true;
    }
    if (!user.unit) {
      user.unit = user.branch;
      changed = true;
    }
    if (changed) {
      await user.save();
      usersUpdated++;
    }
  }
  console.log(`[MIGRATION] ✅ Users Migrated: ${usersUpdated} / ${users.length} records updated.`);

  // 2. Migrate Workers
  const workers = await Worker.find({});
  let workersUpdated = 0;
  for (const worker of workers) {
    let changed = false;
    if (!worker.branch) {
      worker.branch = worker.assignedSite || defaultBranch;
      changed = true;
    }
    if (!worker.assignedSite) {
      worker.assignedSite = worker.branch;
      changed = true;
    }
    if (changed) {
      await worker.save();
      workersUpdated++;
    }
  }
  console.log(`[MIGRATION] ✅ Workers Migrated: ${workersUpdated} / ${workers.length} records updated.`);

  // 3. Migrate Pending Workers
  const pendingWorkers = await PendingWorker.find({});
  let pendingUpdated = 0;
  for (const pending of pendingWorkers) {
    if (!pending.branch) {
      pending.branch = defaultBranch;
      await pending.save();
      pendingUpdated++;
    }
  }
  console.log(`[MIGRATION] ✅ Pending Workers Migrated: ${pendingUpdated} / ${pendingWorkers.length} records updated.`);

  // 4. Migrate Registration OTPs
  const otps = await RegistrationOTP.find({});
  let otpsUpdated = 0;
  for (const otp of otps) {
    if (!otp.branch) {
      otp.branch = defaultBranch;
      await otp.save();
      otpsUpdated++;
    }
  }
  console.log(`[MIGRATION] ✅ Registration OTPs Migrated: ${otpsUpdated} / ${otps.length} records updated.`);

  console.log('\n=============================================================');
  console.log('         ✅ ALL DATABASE RECORDS MIGRATED SAFELY!           ');
  console.log('=============================================================\n');

  await mongoose.disconnect();
}

migrateBranches().catch((err) => {
  console.error('[MIGRATION ERROR]', err);
  process.exit(1);
});

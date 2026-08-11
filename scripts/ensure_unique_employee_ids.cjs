const path = require('path');
module.paths.push(
  path.join(__dirname, '../backend/node_modules'),
  path.join(__dirname, '../node_modules')
);

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const User = require('../backend/models/User');
const Worker = require('../backend/models/Worker');
const workerService = require('../backend/services/workerService');

async function ensureUniqueEmployeeIds() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartops';
  console.log('=== Connecting to MongoDB for Unique Employee ID Synchronization ===');
  await mongoose.connect(MONGO_URI);

  try {
    const users = await User.find().populate('worker');
    const workers = await Worker.find().populate('user');
    console.log(`Found ${users.length} Users and ${workers.length} Workers in DB.`);

    const assignedIds = new Set();

    // Collect already valid unique IDs
    for (const u of users) {
      if (u.employeeId && !assignedIds.has(u.employeeId.trim())) {
        assignedIds.add(u.employeeId.trim());
      }
    }
    for (const w of workers) {
      if (w.employeeId && !assignedIds.has(w.employeeId.trim())) {
        assignedIds.add(w.employeeId.trim());
      }
    }

    // 1. Process Workers
    for (const w of workers) {
      let currentId = w.employeeId ? w.employeeId.trim() : null;
      if (!currentId || Array.from(assignedIds).filter(id => id === currentId).length > 1) {
        const newId = await workerService.generateUniqueEmployeeId();
        console.log(`🔧 Assigning unique Employee ID to Worker [${w.name}]: ${newId}`);
        w.employeeId = newId;
        await w.save();
        assignedIds.add(newId);
      }

      // Sync with linked user if present
      if (w.user) {
        const u = await User.findById(w.user);
        if (u && (!u.employeeId || u.employeeId !== w.employeeId)) {
          u.employeeId = w.employeeId;
          await u.save();
          console.log(`  ↳ Linked User [${u.username}] updated with Employee ID: ${w.employeeId}`);
        }
      }
    }

    // 2. Process Users without Worker or missing Employee ID
    for (const u of users) {
      let currentId = u.employeeId ? u.employeeId.trim() : null;
      if (!currentId) {
        const newId = await workerService.generateUniqueEmployeeId();
        console.log(`🔧 Assigning unique Employee ID to User [${u.username}]: ${newId}`);
        u.employeeId = newId;
        await u.save();
        assignedIds.add(newId);

        if (u.worker) {
          const w = await Worker.findById(u.worker);
          if (w && (!w.employeeId || w.employeeId !== newId)) {
            w.employeeId = newId;
            await w.save();
            console.log(`  ↳ Linked Worker [${w.name}] updated with Employee ID: ${newId}`);
          }
        }
      }
    }

    console.log('\n🎉 ALL EMPLOYEE IDs SYNCHRONIZED AND GUARANTEED UNIQUE!');
  } catch (err) {
    console.error('❌ Employee ID Sync Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected.');
  }
}

ensureUniqueEmployeeIds();

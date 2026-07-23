const path = require('path');
module.paths.push(
  path.join(__dirname, '../backend/node_modules'),
  path.join(__dirname, '../node_modules')
);

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

const User = require('../backend/models/User');
const Worker = require('../backend/models/Worker');

async function fixAndSyncDatabaseRoles() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartops';
  console.log('=== Connecting to MongoDB for Role Synchronization ===');
  await mongoose.connect(MONGO_URI);

  try {
    // 1. Sync User documents linked to Worker profiles
    const users = await User.find().populate('worker');
    console.log(`Found ${users.length} total users in database.`);

    for (const u of users) {
      if (u.worker) {
        const workerRole = u.worker.role || 'Worker';
        if (workerRole.toLowerCase() === 'worker' && u.role.toLowerCase() !== 'worker') {
          console.log(`🔧 Fixing User [${u.username}]: changing role from '${u.role}' to 'Worker'`);
          u.role = 'Worker';
          await u.save();
        } else if (workerRole.toLowerCase() === 'supervisor' && u.role.toLowerCase() !== 'supervisor' && u.role.toLowerCase() !== 'owner') {
          console.log(`🔧 Fixing User [${u.username}]: changing role from '${u.role}' to 'Supervisor'`);
          u.role = 'Supervisor';
          await u.save();
        }
      }
    }

    // 2. Ensure every Worker document has a corresponding User account with role = 'Worker'
    const workers = await Worker.find();
    console.log(`Found ${workers.length} total workers in database.`);

    for (const w of workers) {
      if ((w.role || '').toLowerCase() === 'worker') {
        let user = await User.findOne({ 
          $or: [{ worker: w._id }, { username: w.name.toLowerCase().replace(/\s+/g, '') }] 
        });

        if (!user) {
          const username = w.name.toLowerCase().replace(/\s+/g, '');
          const rawPassword = 'Worker@123';
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(rawPassword, salt);

          console.log(`✨ Creating missing User account for Worker [${w.name}] -> Username: ${username}`);
          user = await User.create({
            username,
            email: w.email || `${username}@factory.com`,
            employeeId: w.employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
            password: hashedPassword,
            role: 'Worker',
            department: w.department || 'Operations',
            phone: w.phone || '',
            status: w.status || 'Active',
            worker: w._id
          });
        } else {
          let updated = false;
          if (user.role.toLowerCase() !== 'worker') {
            user.role = 'Worker';
            updated = true;
          }
          if (!user.worker) {
            user.worker = w._id;
            updated = true;
          }
          if (updated) {
            console.log(`🔧 Updating User [${user.username}] to role 'Worker' linked to Worker [${w.name}]`);
            await user.save();
          }
        }

        if (!w.user || w.user.toString() !== user._id.toString()) {
          w.user = user._id;
          await w.save();
        }
      }
    }

    console.log('\n🎉 ALL DATABASE ROLES FIXED & SYNCHRONIZED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Database Role Fix Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB Disconnected.');
  }
}

fixAndSyncDatabaseRoles();

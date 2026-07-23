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

async function checkDatabaseRoles() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartops';
  await mongoose.connect(MONGO_URI);

  console.log('=== Checking Users in MongoDB ===');
  const users = await User.find().populate('worker');
  users.forEach(u => {
    console.log(`User: ${u.username} | Email: ${u.email} | User Role: ${u.role} | Linked Worker: ${u.worker ? u.worker.name : 'None'} | Worker Role: ${u.worker ? u.worker.role : 'N/A'}`);
  });

  console.log('\n=== Checking Workers in MongoDB ===');
  const workers = await Worker.find();
  workers.forEach(w => {
    console.log(`Worker: ${w.name} | Worker Role: ${w.role} | Linked User ID: ${w.user || 'None'}`);
  });

  await mongoose.disconnect();
}

checkDatabaseRoles();

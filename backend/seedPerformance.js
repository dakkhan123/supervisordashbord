const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Worker = require('./models/Worker');
const Task = require('./models/Task');
const Attendance = require('./models/Attendance');

dotenv.config({ path: path.join(__dirname, '.env') });

const seedPerformanceData = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('🔴 Error: MONGO_URI is not defined in the environment variables.');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB for performance seeding...');

    // Clear existing performance data
    await Worker.deleteMany({});
    await Task.deleteMany({});
    await Attendance.deleteMany({});
    console.log('Cleared existing workers, tasks, and attendance.');

    // Seed Workers
    const workers = await Worker.insertMany([
      { name: 'Amit Sharma', phone: '9876543210', role: 'Worker', salary: 18000, status: 'Active' },
      { name: 'Priya Patel', phone: '9876543211', role: 'Worker', salary: 20000, status: 'Active' },
      { name: 'Rahul Verma', phone: '9876543212', role: 'Worker', salary: 17500, status: 'Active' },
      { name: 'Sneha Kulkarni', phone: '9876543213', role: 'Worker', salary: 19000, status: 'Active' },
      { name: 'Vikram Desai', phone: '9876543214', role: 'Supervisor', salary: 28000, status: 'Active' },
      { name: 'Anjali Nair', phone: '9876543215', role: 'Worker', salary: 18500, status: 'Active' },
      { name: 'Rajesh Gupta', phone: '9876543216', role: 'Worker', salary: 17000, status: 'Active' },
      { name: 'Kavita Singh', phone: '9876543217', role: 'Worker', salary: 19500, status: 'Active' },
    ]);
    console.log(`${workers.length} workers seeded.`);

    // Seed Tasks
    const statuses = ['Pending', 'In Progress', 'Completed'];
    const taskTitles = [
      'Assemble PCB batch #2045', 'Quality check Fan Assembly', 'Pack shipment order #891',
      'Solder resistor kits', 'Inventory audit Rack A', 'Clean workstation B-3',
      'Test battery batch', 'Label packaging boxes', 'Sort incoming raw materials',
      'Calibrate power supplies', 'Wire harness assembly', 'Update stock records',
      'Replace conveyor belt', 'Inspect gasket inventory', 'Prepare monthly report',
      'Organize cable storage', 'Test microcontroller batch', 'Restock consumables shelf',
      'Verify shipment manifest', 'Maintain soldering stations', 'Document quality issues',
      'Setup new workbench', 'Train new worker on PCB', 'Review safety compliance',
      'Optimize packing process', 'Count raw material stock', 'File restock requests',
      'Adjust machine settings', 'Clean storage racks', 'Prepare shipping labels'
    ];

    const tasks = [];
    const now = new Date();
    for (let i = 0; i < taskTitles.length; i++) {
      const worker = workers[i % workers.length];
      const daysAgo = Math.floor(Math.random() * 60);
      const createdDate = new Date(now);
      createdDate.setDate(createdDate.getDate() - daysAgo);

      const status = statuses[i % 3];
      const dueDate = new Date(createdDate);
      dueDate.setDate(dueDate.getDate() + Math.floor(Math.random() * 10) + 2);

      const updatedDate = status === 'Completed' 
        ? new Date(createdDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000) 
        : new Date();

      tasks.push({
        title: taskTitles[i],
        description: `Task assigned to ${worker.name}`,
        assignedTo: worker._id,
        dueDate,
        status,
        createdAt: createdDate,
        updatedAt: updatedDate
      });
    }
    await Task.insertMany(tasks);
    console.log(`${tasks.length} tasks seeded.`);

    // Seed Attendance (last 30 days for all workers)
    const attendanceRecords = [];
    const attendanceStatuses = ['Present', 'Present', 'Present', 'Present', 'Absent', 'Leave']; // 66% present bias
    for (let d = 0; d < 30; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;
      
      for (const worker of workers) {
        const status = attendanceStatuses[Math.floor(Math.random() * attendanceStatuses.length)];
        attendanceRecords.push({
          worker: worker._id,
          date,
          status
        });
      }
    }
    await Attendance.insertMany(attendanceRecords);
    console.log(`${attendanceRecords.length} attendance records seeded.`);

    console.log('\n✅ Performance data seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding Error:', error.message);
    process.exit(1);
  }
};

seedPerformanceData();

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const dns = require('dns');

dns.setServers(['1.1.1.1', '8.8.8.8']);
dotenv.config({ path: path.join(__dirname, '.env') });

const testAtlasConnection = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  console.log('🔗 Connecting to URI:', uri.replace(/:([^@]+)@/, ':****@'));

  try {
    const conn = await mongoose.connect(uri);
    const dbName = conn.connection.name;
    const host = conn.connection.host;
    console.log(`✅ Successfully connected to MongoDB Host: ${host}`);
    console.log(`📂 Active Database Name: ${dbName}`);

    // Create test collection & document
    const testSchema = new mongoose.Schema({ testKey: String, timestamp: Date });
    const TestModel = mongoose.model('atlas_test_verification', testSchema);

    const testDoc = await TestModel.create({
      testKey: 'atlas_connection_verify_123',
      timestamp: new Date()
    });
    console.log(`📝 Test Document Created with ID: ${testDoc._id}`);

    // Read back test document
    const readDoc = await TestModel.findById(testDoc._id);
    if (readDoc && readDoc.testKey === 'atlas_connection_verify_123') {
      console.log('📖 Verification Read Successful: Document retrieved matches created test document.');
    } else {
      throw new Error('Document read back failed or mismatched!');
    }

    // Cleanup test document
    await TestModel.findByIdAndDelete(testDoc._id);
    console.log('🧹 Temporary test document deleted successfully.');

    // List collections
    const collections = await conn.connection.db.listCollections().toArray();
    console.log('📋 Collections in DB:', collections.map(c => c.name));

    await mongoose.disconnect();
    console.log('✅ Connection verification complete!');
  } catch (err) {
    console.error('❌ Connection Verification Failed:', err);
    process.exit(1);
  }
};

testAtlasConnection();

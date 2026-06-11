const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Inventory = require('./models/Inventory');
const InventoryHistory = require('./models/InventoryHistory');

dotenv.config();

const items = [
  { name: 'Exide Lithium Battery 4000mAh',       sku: 'BAT-EX-4000-X',  cat: 'Electronics', qty: 124,  threshold: 250,  loc: 'Rack D-05, Pune',      val: 850,  gst: 18, emoji: '🔋', supplier: 'Tata Electronics Supply Co., Mumbai' },
  { name: 'STM32 Microcontroller M4',          sku: 'MCU-STM-M4-02',  cat: 'Electronics', qty: 892,  threshold: 1000, loc: 'Rack A-12, Pune',      val: 420,  gst: 18, emoji: '💾', supplier: 'Bharat Components Ltd., Pune' },
  { name: 'Precision Resistor Kit',             sku: 'RES-KIT-PREC-A', cat: 'Electronics', qty: 12,   threshold: 50,   loc: 'Rack A-01, Pune',      val: 310,  gst: 18, emoji: '🔌', supplier: 'Havells India Ltd., Noida' },
  { name: 'Polycab USB-C Industrial Cable 1M',   sku: 'CBL-PC-USBC-1M', cat: 'Electronics', qty: 450,  threshold: 400,  loc: 'Rack C-08, Pune',      val: 185,  gst: 18, emoji: '🔌', supplier: 'Polycab India, Halol' },
  { name: 'Primary Connector Housing',           sku: 'CH-0942',        cat: 'Mechanical',  qty: 8,    threshold: 50,   loc: 'Rack F-22, Pune',      val: 465,  gst: 18, emoji: '🔩', supplier: 'L&T Industrial Supply, Chennai' },
  { name: 'Steel Rivet Bundle 12mm',              sku: 'RB-1200',        cat: 'Mechanical',  qty: 120,  threshold: 150,  loc: 'Aisle B-3, Pune',      val: 7,    gst: 18, emoji: '🔩', supplier: 'Bharat Components Ltd., Pune' },
  { name: 'Industrial Gasket XL',               sku: 'GSK-IND-XL',     cat: 'Mechanical',  qty: 830,  threshold: 200,  loc: 'Rack E-7, Pune',       val: 105,  gst: 18, emoji: '⚙️', supplier: 'L&T Industrial Supply, Chennai' },
  { name: 'Fan Assembly 120mm DC',              sku: 'FAN-120-DC',     cat: 'Mechanical',  qty: 350,  threshold: 100,  loc: 'Rack C-12, Pune',      val: 720,  gst: 18, emoji: '🌀', supplier: 'Bharat Components Ltd., Pune' },
  { name: 'Dow Thermal Paste 50g',               sku: 'TP-DOW-50G',     cat: 'Consumables', qty: 200,  threshold: 100,  loc: 'Shelf S-2, Pune',      val: 270,  gst: 18, emoji: '🧴', supplier: 'Havells India Ltd., Noida' },
  { name: 'Isopropyl Alcohol 99% 1L',            sku: 'IPA-99-1L',      cat: 'Consumables', qty: 45,   threshold: 80,   loc: 'Cabinet C, Pune',      val: 380,  gst: 18, emoji: '🧪', supplier: 'Tata Electronics Supply Co., Mumbai' },
  { name: 'Anti-Static Foam Sheet A4',           sku: 'ASF-A4-100',     cat: 'Packaging',   qty: 1200, threshold: 300,  loc: 'Stack P-1, Pune',      val: 10,   gst: 12, emoji: '📄', supplier: 'Polycab India, Halol' },
  { name: 'Bubble Wrap Roll 50m',                sku: 'BW-ROLL-50M',    cat: 'Packaging',   qty: 18,   threshold: 25,   loc: 'Store P-4, Pune',      val: 1150, gst: 12, emoji: '📦', supplier: 'Tata Electronics Supply Co., Mumbai' },
  { name: 'Cardboard Box 30x20x10 cm',           sku: 'BOX-SM-3020',    cat: 'Packaging',   qty: 540,  threshold: 200,  loc: 'Stack P-2, Pune',      val: 55,   gst: 12, emoji: '📦', supplier: 'Bharat Components Ltd., Pune' },
  { name: 'Copper Sheet 0.5mm 1m²',              sku: 'COP-SHT-05-1',   cat: 'Raw Materials',qty: 95,   threshold: 40,   loc: 'Rack M-1, Pune',       val: 2340, gst: 5,  emoji: '🟤', supplier: 'Tata Electronics Supply Co., Mumbai' },
  { name: 'Aluminum Rod 10mm 3m',                sku: 'ALU-ROD-10-3M',  cat: 'Raw Materials',qty: 220,  threshold: 80,   loc: 'Floor F-2, Pune',      val: 530,  gst: 5,  emoji: '🔘', supplier: 'L&T Industrial Supply, Chennai' },
  { name: 'PCB Blank FR4 10x10cm',               sku: 'PCB-FR4-10',     cat: 'Electronics', qty: 300,  threshold: 100,  loc: 'Rack A-09, Pune',      val: 150,  gst: 18, emoji: '💚', supplier: 'Bharat Components Ltd., Pune' },
  { name: 'Multicore Solder Wire 60/40 500g',    sku: 'SLD-6040-500',   cat: 'Consumables', qty: 65,   threshold: 50,   loc: 'Cabinet S, Pune',      val: 625,  gst: 18, emoji: '🔧', supplier: 'Havells India Ltd., Noida' },
  { name: 'Cable Ties 200mm Pack/100',           sku: 'CT-200-P100',    cat: 'Consumables', qty: 480,  threshold: 150,  loc: 'Shelf C-5, Pune',      val: 100,  gst: 18, emoji: '🔗', supplier: 'Polycab India, Halol' },
  { name: 'Heat Shrink Tube 3mm/1m',             sku: 'HST-3MM-1M',     cat: 'Consumables', qty: 700,  threshold: 200,  loc: 'Shelf C-6, Pune',      val: 38,   gst: 18, emoji: '🌡️', supplier: 'Polycab India, Halol' },
  { name: 'DC Power Supply 12V 5A',              sku: 'PSU-12V-5A',     cat: 'Electronics', qty: 55,   threshold: 30,   loc: 'Rack E-1, Pune',       val: 1830, gst: 18, emoji: '⚡', supplier: 'L&T Industrial Supply, Chennai' },
];

const historyEntries = [
  { date: new Date('2025-06-11T09:30:00Z'), item: 'Fan Assembly 120mm DC',         sku: 'FAN-120-DC',    type: 'in',  qty: 250, gst: 18, op: 'Rahul Sharma',     loc: 'Rack C-12, Pune',    val: 180000 },
  { date: new Date('2025-06-11T11:45:00Z'), item: 'STM32 Microcontroller M4',      sku: 'MCU-STM-M4-02', type: 'out', qty: 120, gst: 18, op: 'Auto-Reorder', loc: 'Rack A-12, Pune',    val: 50400  },
  { date: new Date('2025-06-10T08:15:00Z'), item: 'Bubble Wrap Roll 50m',               sku: 'BW-ROLL-50M',   type: 'in',  qty: 30,  gst: 12, op: 'Priya Singh',      loc: 'Store P-4, Pune',   val: 34500  },
  { date: new Date('2025-06-10T14:20:00Z'), item: 'PCB Blank FR4 10x10cm',        sku: 'PCB-FR4-10',    type: 'out', qty: 80,  gst: 18, op: 'System',           loc: 'Rack A-09, Pune',    val: 12000  },
  { date: new Date('2025-06-09T10:05:00Z'), item: 'Primary Connector Housing',       sku: 'CH-0942',       type: 'out', qty: 12,  gst: 18, op: 'Amit Patil',       loc: 'Rack F-22, Pune',    val: 5580   },
  { date: new Date('2025-06-09T16:30:00Z'), item: 'Copper Sheet 0.5mm 1m²',              sku: 'COP-SHT-05-1',  type: 'in',  qty: 50,  gst: 5,  op: 'Tata Supply Co.',  loc: 'Rack M-1, Pune',     val: 117000 },
  { date: new Date('2025-06-08T09:00:00Z'), item: 'Cable Ties 200mm Pack/100',           sku: 'CT-200-P100',   type: 'in',  qty: 500, gst: 18, op: 'Rahul Sharma',     loc: 'Shelf C-5, Pune',   val: 50000  },
  { date: new Date('2025-06-08T15:10:00Z'), item: 'Isopropyl Alcohol 99% 1L',        sku: 'IPA-99-1L',     type: 'out', qty: 15,  gst: 18, op: 'Audit Team',        loc: 'Cabinet C, Pune',   val: 5700   },
  { date: new Date('2025-06-07T11:22:00Z'), item: 'DC Power Supply 12V 5A',          sku: 'PSU-12V-5A',    type: 'in',  qty: 20,  gst: 18, op: 'Priya Singh',      loc: 'Rack E-1, Pune',     val: 36600  },
  { date: new Date('2025-06-07T14:40:00Z'), item: 'Steel Rivet Bundle 12mm',           sku: 'RB-1200',       type: 'out', qty: 200, gst: 18, op: 'System',           loc: 'Aisle B-3, Pune', val: 1400    },
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smartops');
    console.log('Connected to MongoDB for seeding...');
    
    // Clear existing
    await Inventory.deleteMany({});
    await InventoryHistory.deleteMany({});
    console.log('Database cleared.');

    // Seed items
    await Inventory.insertMany(items);
    console.log('Inventory items seeded.');

    // Seed logs
    await InventoryHistory.insertMany(historyEntries);
    console.log('Inventory history logs seeded.');

    console.log('Database Seeding Completed Successfully.');
    process.exit();
  } catch (error) {
    console.error('Seeding Error:', error.message);
    process.exit(1);
  }
};

seedDB();

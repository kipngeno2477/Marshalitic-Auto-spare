const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const dns = require('dns');

dotenv.config();

// Fix for Windows Node.js SRV record lookup with MongoDB Atlas
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mashalitic_db';

let client = null;
let dbInstance = null;

// Initialize MongoDB Connection
async function initialize() {
  if (dbInstance) return dbInstance;

  try {
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    dbInstance = client.db();
    console.log(`🚀 Database Connected: MongoDB -> ${dbInstance.databaseName} (${MONGODB_URI})`);

    // Ensure essential indexes
    await ensureIndexes(dbInstance);

    return dbInstance;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    throw err;
  }
}

// Ensure indexes across collections
async function ensureIndexes(db) {
  try {
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ id: 1 }, { unique: true });
    await db.collection('products').createIndex({ id: 1 }, { unique: true });
    await db.collection('products').createIndex({ sku: 1 });
    await db.collection('products').createIndex({ barcode: 1 });
    await db.collection('products').createIndex({ category_id: 1 });
    await db.collection('products').createIndex({ brand_id: 1 });
    await db.collection('categories').createIndex({ id: 1 }, { unique: true });
    await db.collection('categories').createIndex({ slug: 1 }, { unique: true });
    await db.collection('brands').createIndex({ id: 1 }, { unique: true });
    await db.collection('customers').createIndex({ id: 1 }, { unique: true });
    await db.collection('customers').createIndex({ phone: 1 });
    await db.collection('suppliers').createIndex({ id: 1 }, { unique: true });
    await db.collection('vehicles').createIndex({ id: 1 }, { unique: true });
    await db.collection('product_vehicle_compatibility').createIndex({ product_id: 1, vehicle_id: 1 }, { unique: true });
    await db.collection('sales').createIndex({ id: 1 }, { unique: true });
    await db.collection('sales').createIndex({ invoice_number: 1 }, { unique: true });
    await db.collection('sales').createIndex({ sale_date: -1 });
    await db.collection('sale_items').createIndex({ id: 1 }, { unique: true });
    await db.collection('sale_items').createIndex({ sale_id: 1 });
    await db.collection('sale_items').createIndex({ product_id: 1 });
    await db.collection('payments').createIndex({ id: 1 }, { unique: true });
    await db.collection('payments').createIndex({ sale_id: 1 });
    await db.collection('purchases').createIndex({ id: 1 }, { unique: true });
    await db.collection('purchases').createIndex({ po_number: 1 }, { unique: true });
    await db.collection('purchase_items').createIndex({ id: 1 }, { unique: true });
    await db.collection('purchase_items').createIndex({ purchase_id: 1 });
    await db.collection('expenses').createIndex({ id: 1 }, { unique: true });
    await db.collection('expenses').createIndex({ expense_date: -1 });
    await db.collection('stock_movements').createIndex({ id: 1 }, { unique: true });
    await db.collection('stock_movements').createIndex({ product_id: 1 });
    await db.collection('returns').createIndex({ id: 1 }, { unique: true });
    await db.collection('shop_settings').createIndex({ setting_key: 1 }, { unique: true });
    await db.collection('audit_logs').createIndex({ id: 1 }, { unique: true });
    await db.collection('notifications').createIndex({ id: 1 }, { unique: true });
  } catch (idxErr) {
    console.warn('⚠️ Index creation notice:', idxErr.message);
  }
}

// Return raw Db
function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initialize() first.');
  }
  return dbInstance;
}

// Return Collection
function getCollection(name) {
  return getDb().collection(name);
}

// Atomic auto-incrementing integer sequence ID for MongoDB collections
async function getNextId(sequenceName) {
  const counters = getDb().collection('counters');
  const result = await counters.findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return result.seq;
}

// Transaction helper with replica set & standalone fallback
async function transaction(callback) {
  if (!client) {
    await initialize();
  }
  
  let session = null;
  try {
    session = client.startSession();
    let result;
    try {
      await session.withTransaction(async () => {
        result = await callback(session);
      });
      return result;
    } catch (trxErr) {
      // If standalone MongoDB (not replica set), transactions are not supported: execute directly
      if (trxErr.message && trxErr.message.includes('replica set')) {
        return await callback(null);
      }
      throw trxErr;
    }
  } catch (err) {
    if (err.message && err.message.includes('replica set')) {
      return await callback(null);
    }
    throw err;
  } finally {
    if (session) {
      await session.endSession().catch(() => {});
    }
  }
}

// Close client
async function close() {
  if (client) {
    await client.close();
    client = null;
    dbInstance = null;
  }
}

module.exports = {
  initialize,
  getDb,
  getCollection,
  getNextId,
  transaction,
  close,
  getClient: () => client
};

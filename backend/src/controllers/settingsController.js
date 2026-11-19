const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get Settings
exports.getSettings = async (req, res) => {
  try {
    const settingsCol = db.getCollection('shop_settings');
    const settings = await settingsCol.find({}).toArray();
    const settingsMap = {};
    settings.forEach(r => {
      settingsMap[r.setting_key] = r.setting_value;
    });
    res.json({ success: true, data: settingsMap });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch settings' });
  }
};

// 2. Update Settings
exports.updateSettings = async (req, res) => {
  try {
    const settings = req.body;
    const settingsCol = db.getCollection('shop_settings');
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    for (const [key, val] of Object.entries(settings)) {
      await settingsCol.updateOne(
        { setting_key: key },
        {
          $set: {
            setting_value: String(val),
            updated_at: now
          },
          $setOnInsert: {
            description: 'System preference setting'
          }
        },
        { upsert: true }
      );
    }

    await logActivity(req.user ? req.user.id : 1, 'SETTINGS_UPDATE', 'Settings', 'Updated system preferences');
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
};

// 3. Database Backup Utility
exports.createBackup = async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_mashalitic_${timestamp}.json`;
    const backupFilePath = path.join(backupDir, backupFileName);

    const collections = [
      'users', 'categories', 'brands', 'vehicles', 'products',
      'product_vehicle_compatibility', 'customers', 'suppliers',
      'sales', 'sale_items', 'payments', 'purchases', 'purchase_items',
      'expenses', 'stock_movements', 'returns', 'return_items',
      'shop_settings', 'audit_logs', 'notifications'
    ];

    const snapshot = {};
    const database = db.getDb();
    for (const colName of collections) {
      snapshot[colName] = await database.collection(colName).find({}, { projection: { _id: 0 } }).toArray();
    }

    fs.writeFileSync(backupFilePath, JSON.stringify(snapshot, null, 2), 'utf8');
    await logActivity(req.user ? req.user.id : 1, 'BACKUP_CREATE', 'System', `Created backup snapshot: ${backupFileName}`);

    res.json({
      success: true,
      message: 'Database backup created successfully',
      filename: backupFileName,
      path: backupFilePath,
      tablesArchived: Object.keys(snapshot).length,
      createdAt: timestamp
    });
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).json({ success: false, message: 'Backup creation failed' });
  }
};

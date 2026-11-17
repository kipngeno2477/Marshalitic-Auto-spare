const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get Settings
exports.getSettings = async (req, res) => {
  try {
    const result = await db.query('SELECT setting_key, setting_value, description FROM shop_settings');
    const settingsMap = {};
    result.rows.forEach(r => {
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
    const settings = req.body; // key-value object

    for (const [key, val] of Object.entries(settings)) {
      try {
        await db.query(
          `INSERT OR REPLACE INTO shop_settings (setting_key, setting_value) VALUES (?, ?)`,
          [key, String(val)]
        );
      } catch (e) {
        await db.query(
          `INSERT INTO shop_settings (setting_key, setting_value) VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [key, String(val)]
        );
      }
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

    // Export all critical tables to JSON backup snapshot
    const tables = ['users', 'categories', 'brands', 'vehicles', 'products', 'product_vehicle_compatibility', 'customers', 'suppliers', 'sales', 'sale_items', 'payments', 'purchases', 'purchase_items', 'expenses', 'stock_movements', 'returns', 'shop_settings'];

    const snapshot = {};
    for (const tbl of tables) {
      const data = await db.query(`SELECT * FROM ${tbl}`);
      snapshot[tbl] = data.rows;
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

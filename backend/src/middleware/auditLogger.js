const db = require('../config/db');

async function logActivity(userId, action, module, details = null, ipAddress = null) {
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, module, details, ip_address) VALUES (?, ?, ?, ?, ?)`,
      [userId || null, action, module, typeof details === 'object' ? JSON.stringify(details) : details, ipAddress || '127.0.0.1']
    );
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logActivity };

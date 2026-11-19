const db = require('../config/db');

async function logActivity(userId, action, module, details = null, ipAddress = null) {
  try {
    const col = db.getCollection('audit_logs');
    const id = await db.getNextId('audit_logs');
    await col.insertOne({
      id,
      user_id: userId != null ? Number(userId) : null,
      action,
      module,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      ip_address: ipAddress || '127.0.0.1',
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logActivity };

const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get Users
exports.getUsers = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, email, phone, role, status, avatar_url, last_login, created_at
      FROM users
      ORDER BY name ASC
    `);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve users' });
  }
};

// 2. Create User
exports.createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role, avatar_url } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required' });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(`
      INSERT INTO users (name, email, phone, password_hash, role, status, avatar_url)
      VALUES (?, ?, ?, ?, ?, 'active', ?)
    `, [name, email.trim().toLowerCase(), phone || '', hash, role, avatar_url || null]);

    await logActivity(req.user ? req.user.id : 1, 'USER_CREATE', 'Users', `Created user ${name} with role ${role}`);
    res.status(201).json({ success: true, userId: result.insertId });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
};

// 3. Update User
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role, status, password } = req.body;

    let updateSql = 'UPDATE users SET name = ?, phone = ?, role = ?, status = ?, updated_at = CURRENT_TIMESTAMP';
    const params = [name, phone, role, status || 'active'];

    if (password && password.length >= 6) {
      const hash = await bcrypt.hash(password, 10);
      updateSql += ', password_hash = ?';
      params.push(hash);
    }

    updateSql += ' WHERE id = ?';
    params.push(id);

    await db.query(updateSql, params);
    await logActivity(req.user ? req.user.id : 1, 'USER_UPDATE', 'Users', `Updated user ID ${id}`);
    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update user' });
  }
};

// 4. Activity Logs
exports.getActivityLogs = async (req, res) => {
  try {
    const { module, limit = 50 } = req.query;
    let sql = `
      SELECT 
        al.*,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (module) {
      sql += ` AND al.module = ?`;
      params.push(module);
    }

    sql += ` ORDER BY al.created_at DESC LIMIT ?`;
    params.push(parseInt(limit, 10));

    const result = await db.query(sql, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching audit logs' });
  }
};

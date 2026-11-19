const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get Users
exports.getUsers = async (req, res) => {
  try {
    const usersCol = db.getCollection('users');
    const users = await usersCol
      .find({}, { projection: { password_hash: 0, _id: 0 } })
      .sort({ name: 1 })
      .toArray();

    res.json({ success: true, count: users.length, data: users });
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

    const usersCol = db.getCollection('users');
    const existing = await usersCol.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const id = await db.getNextId('users');
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newUser = {
      id,
      name,
      email: email.trim().toLowerCase(),
      phone: phone || '',
      password_hash: hash,
      role,
      status: 'active',
      avatar_url: avatar_url || null,
      last_login: null,
      created_at: now,
      updated_at: now
    };

    await usersCol.insertOne(newUser);
    await logActivity(req.user ? req.user.id : 1, 'USER_CREATE', 'Users', `Created user ${name} with role ${role}`);

    res.status(201).json({ success: true, userId: id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create user' });
  }
};

// 3. Update User
exports.updateUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, phone, role, status, password } = req.body;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const updateFields = {
      name,
      phone,
      role,
      status: status || 'active',
      updated_at: now
    };

    if (password && password.length >= 6) {
      updateFields.password_hash = await bcrypt.hash(password, 10);
    }

    const usersCol = db.getCollection('users');
    await usersCol.updateOne({ id }, { $set: updateFields });

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
    const filter = {};
    if (module) {
      filter.module = module;
    }

    const logsCol = db.getCollection('audit_logs');
    const usersCol = db.getCollection('users');

    const logs = await logsCol
      .find(filter, { projection: { _id: 0 } })
      .sort({ created_at: -1 })
      .limit(parseInt(limit, 10))
      .toArray();

    // Map user info
    const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))];
    const users = await usersCol
      .find({ id: { $in: userIds } }, { projection: { id: 1, name: 1, email: 1, role: 1, _id: 0 } })
      .toArray();
    const userMap = new Map(users.map(u => [u.id, u]));

    const enrichedLogs = logs.map(l => {
      const u = userMap.get(l.user_id);
      return {
        ...l,
        user_name: u ? u.name : 'System',
        user_email: u ? u.email : '',
        user_role: u ? u.role : ''
      };
    });

    res.json({ success: true, count: enrichedLogs.length, data: enrichedLogs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching audit logs' });
  }
};

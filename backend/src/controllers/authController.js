const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');
const { logActivity } = require('../middleware/auditLogger');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const usersCol = db.getCollection('users');
    const user = await usersCol.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    await usersCol.updateOne({ id: user.id }, { $set: { last_login: now, updated_at: now } });

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await logActivity(user.id, 'USER_LOGIN', 'Authentication', `User logged in successfully`);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar_url: user.avatar_url,
        last_login: now
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during authentication' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const usersCol = db.getCollection('users');
    const user = await usersCol.findOne(
      { id: Number(req.user.id) },
      { projection: { password_hash: 0, _id: 0 } }
    );
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving profile' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    const usersCol = db.getCollection('users');
    const user = await usersCol.findOne({ id: Number(req.user.id) });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);
    await usersCol.updateOne(
      { id: Number(req.user.id) },
      { $set: { password_hash: newHash, updated_at: now } }
    );

    await logActivity(req.user.id, 'PASSWORD_CHANGE', 'User', 'Password changed successfully');
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update password' });
  }
};

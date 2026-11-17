const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get Expenses
exports.getExpenses = async (req, res) => {
  try {
    const { category, startDate, endDate, search } = req.query;
    let sql = `
      SELECT 
        e.*,
        u.name AS approved_by_name
      FROM expenses e
      JOIN users u ON e.approved_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      sql += ` AND e.category = ?`;
      params.push(category);
    }
    if (startDate) {
      sql += ` AND e.expense_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND e.expense_date <= ?`;
      params.push(endDate);
    }
    if (search) {
      sql += ` AND (e.title LIKE ? OR e.expense_number LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    sql += ` ORDER BY e.expense_date DESC, e.id DESC`;

    const result = await db.query(sql, params);

    // Calculate totals by category
    const catTotalRes = await db.query(`
      SELECT category, SUM(amount) AS total_amount, COUNT(id) AS count
      FROM expenses
      GROUP BY category
    `);

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
      categorySummary: catTotalRes.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve expenses' });
  }
};

// 2. Create Expense
exports.createExpense = async (req, res) => {
  try {
    const { category, title, amount, expense_date, payment_method, notes } = req.body;
    if (!category || !title || !amount) {
      return res.status(400).json({ success: false, message: 'Category, title, and amount are required' });
    }

    const userId = req.user ? req.user.id : 1;
    const expenseNum = `EXP-2026-${Date.now().toString().slice(-6)}`;

    const result = await db.query(`
      INSERT INTO expenses (expense_number, category, title, amount, expense_date, payment_method, notes, approved_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      expenseNum, category, title, parseFloat(amount),
      expense_date || new Date().toISOString().substring(0, 10),
      payment_method || 'cash', notes || null, userId
    ]);

    await logActivity(userId, 'EXPENSE_CREATE', 'Expenses', `Recorded expense ${expenseNum} (${category}: KSh ${amount})`);
    res.status(201).json({ success: true, expenseId: result.insertId, expenseNumber: expenseNum });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record expense' });
  }
};

// 3. Delete Expense
exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM expenses WHERE id = ?', [id]);
    await logActivity(req.user ? req.user.id : 1, 'EXPENSE_DELETE', 'Expenses', `Deleted expense ID ${id}`);
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
};

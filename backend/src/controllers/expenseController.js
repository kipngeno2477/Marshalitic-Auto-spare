const db = require('../config/db');
const { logActivity } = require('../middleware/auditLogger');

// 1. Get Expenses
exports.getExpenses = async (req, res) => {
  try {
    const { category, startDate, endDate, search } = req.query;
    const filter = {};

    if (category) {
      filter.category = category;
    }
    if (startDate || endDate) {
      filter.expense_date = {};
      if (startDate) filter.expense_date.$gte = startDate;
      if (endDate) filter.expense_date.$lte = endDate;
    }
    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term, 'i');
      filter.$or = [
        { title: regex },
        { expense_number: regex }
      ];
    }

    const expensesCol = db.getCollection('expenses');
    const usersCol = db.getCollection('users');

    const expenses = await expensesCol
      .find(filter, { projection: { _id: 0 } })
      .sort({ expense_date: -1, id: -1 })
      .toArray();

    // Map approved_by_name
    const userIds = [...new Set(expenses.map(e => e.approved_by).filter(Boolean))];
    const users = await usersCol
      .find({ id: { $in: userIds } }, { projection: { id: 1, name: 1, _id: 0 } })
      .toArray();
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const enrichedExpenses = expenses.map(e => ({
      ...e,
      approved_by_name: userMap.get(e.approved_by) || 'Admin'
    }));

    // Category summary aggregation
    const categorySummary = await expensesCol.aggregate([
      {
        $group: {
          _id: '$category',
          total_amount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          total_amount: 1,
          count: 1
        }
      }
    ]).toArray();

    res.json({
      success: true,
      count: enrichedExpenses.length,
      data: enrichedExpenses,
      categorySummary
    });
  } catch (err) {
    console.error('Error fetching expenses:', err);
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
    const id = await db.getNextId('expenses');
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newExpense = {
      id,
      expense_number: expenseNum,
      category,
      title,
      amount: parseFloat(amount),
      expense_date: expense_date || now.substring(0, 10),
      payment_method: payment_method || 'cash',
      receipt_url: null,
      notes: notes || null,
      approved_by: userId,
      created_at: now
    };

    await db.getCollection('expenses').insertOne(newExpense);
    await logActivity(userId, 'EXPENSE_CREATE', 'Expenses', `Recorded expense ${expenseNum} (${category}: KSh ${amount})`);

    res.status(201).json({ success: true, expenseId: id, expenseNumber: expenseNum });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record expense' });
  }
};

// 3. Delete Expense
exports.deleteExpense = async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.getCollection('expenses').deleteOne({ id });
    await logActivity(req.user ? req.user.id : 1, 'EXPENSE_DELETE', 'Expenses', `Deleted expense ID ${id}`);
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
};
